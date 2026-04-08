import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VenueResolverService } from './venue-resolver.service';

vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('VenueResolverService', () => {
  let service: VenueResolverService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new VenueResolverService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('resolve with API key', () => {
    it('should resolve a venue via Google Find Place', async () => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({
          candidates: [{
            place_id: 'ChIJ_GALLERY',
            name: 'Galerie Modern',
            formatted_address: 'Auguststr. 10, 10117 Berlin',
            geometry: { location: { lat: 52.525, lng: 13.395 } },
          }],
        }),
      } as Response);

      const result = await service.resolve({
        id: '42',
        name: 'Galerie Modern',
        lat: 52.525,
        lng: 13.395,
      });

      expect(result!.googlePlaceId).toBe('ChIJ_GALLERY');
      expect(result!.name).toBe('Galerie Modern');

      // Should include location bias in the URL
      const url = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
      expect(url).toContain('locationbias');
      expect(url).toContain('Galerie');
    });

    it('should return cached result without calling API again', async () => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({
          candidates: [{
            place_id: 'ChIJ_CACHED',
            name: 'Cached Gallery',
            formatted_address: 'Some Str.',
            geometry: { location: { lat: 52.52, lng: 13.40 } },
          }],
        }),
      } as Response);

      await service.resolve({ id: '99', name: 'Cached Gallery', lat: 52.52, lng: 13.40 });
      const result = await service.resolve({ id: '99', name: 'Cached Gallery', lat: 52.52, lng: 13.40 });

      expect(result!.googlePlaceId).toBe('ChIJ_CACHED');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should return fallback when no candidates found', async () => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({ candidates: [] }),
      } as Response);

      const result = await service.resolve({
        id: '77',
        name: 'Ghost Gallery',
        lat: 52.50,
        lng: 13.35,
      });

      expect(result!.googlePlaceId).toBe('ib-77');
      expect(result!.formattedAddress).toBe('Berlin, Germany');
    });
  });

  describe('resolve without API key', () => {
    it('should return fallback with ib- prefixed Place ID', async () => {
      delete process.env['GOOGLE_MAPS_API_KEY'];

      const result = await service.resolve({
        id: '55',
        name: 'No Key Gallery',
        lat: 52.53,
        lng: 13.42,
      });

      expect(result).toEqual({
        googlePlaceId: 'ib-55',
        name: 'No Key Gallery',
        formattedAddress: 'Berlin, Germany',
        lat: 52.53,
        lng: 13.42,
      });
    });
  });

  describe('resolve with API error', () => {
    it('should return fallback on network failure', async () => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new Error('Network error')));

      const result = await service.resolve({
        id: '33',
        name: 'Error Gallery',
        lat: 52.51,
        lng: 13.39,
      });

      expect(result!.googlePlaceId).toBe('ib-33');
    });
  });

  describe('cache persistence', () => {
    it('should call writeFileSync when caching a resolved venue', async () => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');
      const { writeFileSync } = await import('fs');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({
          candidates: [{
            place_id: 'ChIJ_PERSIST',
            name: 'Persistent Gallery',
            formatted_address: 'Some Addr',
            geometry: { location: { lat: 52.52, lng: 13.40 } },
          }],
        }),
      } as Response);

      await service.resolve({ id: '88', name: 'Persistent Gallery', lat: 52.52, lng: 13.40 });

      expect(writeFileSync).toHaveBeenCalled();
    });
  });
});
