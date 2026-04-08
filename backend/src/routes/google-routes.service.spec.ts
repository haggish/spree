import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleRoutesService } from './google-routes.service';

describe('GoogleRoutesService', () => {
  let service: GoogleRoutesService;

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('computeRoute (mock mode — no API key)', () => {
    beforeEach(() => {
      delete process.env['GOOGLE_MAPS_API_KEY'];
      service = new GoogleRoutesService();
    });

    it('should return a mock route with haversine distance', async () => {
      const origin = { lat: 52.520, lng: 13.405 };
      const dest = { lat: 52.525, lng: 13.395 };

      const route = await service.computeRoute(origin, dest, 'WALK', 'Home', 'Gallery');

      expect(route.fromLabel).toBe('Home');
      expect(route.toLabel).toBe('Gallery');
      expect(route.travelMode).toBe('WALK');
      expect(route.distanceMeters).toBeGreaterThan(0);
      expect(route.durationSeconds).toBeGreaterThan(0);
      expect(route.polyline).toBe('');
    });

    it('should estimate walk speed at ~5 km/h', async () => {
      // ~1 km distance
      const origin = { lat: 52.520, lng: 13.400 };
      const dest = { lat: 52.529, lng: 13.400 };

      const route = await service.computeRoute(origin, dest, 'WALK');

      // 1km at 5km/h = ~720 seconds (12 min)
      expect(route.durationSeconds).toBeGreaterThan(500);
      expect(route.durationSeconds).toBeLessThan(1000);
    });

    it('should estimate transit faster than walking for same distance', async () => {
      const origin = { lat: 52.520, lng: 13.400 };
      const dest = { lat: 52.550, lng: 13.400 };

      const walk = await service.computeRoute(origin, dest, 'WALK');
      const transit = await service.computeRoute(origin, dest, 'TRANSIT');

      expect(transit.durationSeconds).toBeLessThan(walk.durationSeconds);
    });
  });

  describe('computeRoute (API mode)', () => {
    beforeEach(() => {
      vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');
      service = new GoogleRoutesService();
    });

    it('should call Google Routes API and parse response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({
          routes: [{
            distanceMeters: 1500,
            duration: '600s',
            polyline: { encodedPolyline: 'abc123' },
            legs: [],
          }],
        }),
      } as Response);

      const route = await service.computeRoute(
        { lat: 52.52, lng: 13.40 },
        { lat: 52.53, lng: 13.41 },
        'WALK',
        'A',
        'B',
      );

      expect(route.distanceMeters).toBe(1500);
      expect(route.durationSeconds).toBe(600);
      expect(route.polyline).toBe('abc123');
    });

    it('should extract transit details from TRANSIT response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({
          routes: [{
            distanceMeters: 5000,
            duration: '900s',
            polyline: { encodedPolyline: 'xyz' },
            legs: [{
              distanceMeters: 5000,
              duration: '900s',
              polyline: { encodedPolyline: 'xyz' },
              steps: [
                {
                  travelMode: 'TRANSIT',
                  transitDetails: {
                    stopDetails: {
                      departureStop: { name: 'Alexanderplatz' },
                      arrivalStop: { name: 'Friedrichstraße' },
                    },
                    transitLine: {
                      nameShort: 'S5',
                      vehicle: { type: 'RAIL' },
                    },
                  },
                },
              ],
            }],
          }],
        }),
      } as Response);

      const route = await service.computeRoute(
        { lat: 52.52, lng: 13.41 },
        { lat: 52.52, lng: 13.39 },
        'TRANSIT',
      );

      expect(route.transitDetails).toBeDefined();
      expect(route.transitDetails).toHaveLength(1);
      expect(route.transitDetails![0].lineName).toBe('S5');
      expect(route.transitDetails![0].transitType).toBe('RAIL');
      expect(route.transitDetails![0].departureStop).toBe('Alexanderplatz');
      expect(route.transitDetails![0].arrivalStop).toBe('Friedrichstraße');
    });

    it('should fall back to mock on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('API error'));

      const route = await service.computeRoute(
        { lat: 52.52, lng: 13.40 },
        { lat: 52.53, lng: 13.41 },
        'WALK',
        'A',
        'B',
      );

      // Should still return a valid route (mock)
      expect(route.distanceMeters).toBeGreaterThan(0);
      expect(route.polyline).toBe('');
    });

    it('should fall back to mock when no routes returned', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({ routes: [] }),
      } as Response);

      const route = await service.computeRoute(
        { lat: 52.52, lng: 13.40 },
        { lat: 52.53, lng: 13.41 },
      );

      expect(route.polyline).toBe('');
    });
  });

  describe('computeFastestRoute', () => {
    beforeEach(() => {
      delete process.env['GOOGLE_MAPS_API_KEY'];
      service = new GoogleRoutesService();
    });

    it('should return the faster of walk vs transit', async () => {
      const route = await service.computeFastestRoute(
        { lat: 52.520, lng: 13.400 },
        { lat: 52.550, lng: 13.400 },
        'Home',
        'Dest',
      );

      // For a ~3.3km distance, transit should win
      expect(route.travelMode).toBe('TRANSIT');
    });

    it('should return a valid route for very short distances', async () => {
      const route = await service.computeFastestRoute(
        { lat: 52.520, lng: 13.400 },
        { lat: 52.521, lng: 13.401 },
        'Home',
        'Dest',
      );

      // For very short distances, either mode could win
      expect(['WALK', 'TRANSIT']).toContain(route.travelMode);
      expect(route.durationSeconds).toBeGreaterThan(0);
    });
  });
});
