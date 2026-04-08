import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocationResolverService } from './location-resolver.service';

// Mock fs so the cache doesn't touch disk
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('LocationResolverService', () => {
  let service: LocationResolverService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new LocationResolverService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('resolve with API key', () => {
    it('should resolve a location by street address', async () => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({
          candidates: [{
            place_id: 'ChIJ_PLACE_123',
            name: 'Kulturhaus Mitte',
            formatted_address: 'Musterstr. 1, 10115 Berlin',
            geometry: { location: { lat: 52.52, lng: 13.40 } },
          }],
        }),
      } as Response);

      const result = await service.resolve({
        id: 'L_TEST',
        name: 'Kulturhaus Mitte',
        streetAddress: 'Musterstr. 1',
        postalCode: '10115',
      });

      expect(result!.googlePlaceId).toBe('ChIJ_PLACE_123');
      expect(result!.name).toBe('Kulturhaus Mitte');
      expect(result!.formattedAddress).toBe('Musterstr. 1, 10115 Berlin');
      expect(result!.lat).toBe(52.52);
      expect(result!.lng).toBe(13.40);
    });

    it('should resolve using coordinates with location bias', async () => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({
          candidates: [{
            place_id: 'ChIJ_COORDS',
            name: 'Some Venue',
            formatted_address: 'Addr',
            geometry: { location: { lat: 52.50, lng: 13.35 } },
          }],
        }),
      } as Response);

      // Only lat/lng, no streetAddress — should use coord-based resolution
      const result = await service.resolve({
        id: 'L_COORD',
        name: 'Some Venue',
        lat: 52.50,
        lng: 13.35,
      });

      expect(result!.googlePlaceId).toBe('ChIJ_COORDS');
      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
      expect(fetchCall).toContain('locationbias');
    });

    it('should return cached result on second call', async () => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({
          candidates: [{
            place_id: 'ChIJ_CACHED',
            name: 'Cached Place',
            formatted_address: 'Cached Addr',
            geometry: { location: { lat: 52.51, lng: 13.41 } },
          }],
        }),
      } as Response);

      // First call — hits API
      await service.resolve({ id: 'L_CACHE', name: 'Cached Place', streetAddress: 'Str. 1' });
      // Second call — should use cache
      const result = await service.resolve({ id: 'L_CACHE', name: 'Cached Place', streetAddress: 'Str. 1' });

      expect(result!.googlePlaceId).toBe('ChIJ_CACHED');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolve without API key', () => {
    it('should return fallback with kd- prefixed Place ID', async () => {
      delete process.env['GOOGLE_MAPS_API_KEY'];

      const result = await service.resolve({
        id: 'L_NOKEY',
        name: 'Fallback Venue',
        streetAddress: 'Str. 1',
        lat: 52.53,
        lng: 13.42,
      });

      expect(result).toEqual({
        googlePlaceId: 'kd-L_NOKEY',
        name: 'Fallback Venue',
        formattedAddress: 'Berlin, Germany',
        lat: 52.53,
        lng: 13.42,
      });
    });
  });

  describe('resolve with API error', () => {
    it('should return fallback on network error', async () => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new Error('Network error')));

      const result = await service.resolve({
        id: 'L_ERR',
        name: 'Error Venue',
        lat: 52.54,
        lng: 13.43,
      });

      expect(result!.googlePlaceId).toBe('kd-L_ERR');
    });

    it('should return fallback when no candidates found', async () => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({ candidates: [] }),
      } as Response);

      const result = await service.resolve({
        id: 'L_EMPTY',
        name: 'Unknown Place',
        streetAddress: 'Nirgendwo 99',
      });

      expect(result!.googlePlaceId).toBe('kd-L_EMPTY');
    });
  });
});
