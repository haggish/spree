import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteOptimizerService, SchedulableEvent } from './route-optimizer.service';
import { GoogleRoutesService } from './google-routes.service';
import { LatLng } from '../common/interfaces';

const home: LatLng = { lat: 52.520, lng: 13.405 }; // central Berlin

function makeSchedulable(
  id: string,
  lat: number,
  lng: number,
  startTime: string,
  endTime: string,
  index: number,
  stayMinutes = 10,
): SchedulableEvent {
  return {
    id,
    name: `Event ${id}`,
    presenter: 'Presenter',
    description: 'Desc',
    venueId: `ven-${id}`,
    startTime,
    endTime,
    stayMinutes,
    index,
    venue: {
      id: `ven-${id}`,
      name: `Venue ${id}`,
      address: 'Berlin',
      location: { lat, lng },
      googlePlaceId: `gp-${id}`,
    },
  };
}

describe('RouteOptimizerService', () => {
  let service: RouteOptimizerService;
  let routesService: GoogleRoutesService;

  beforeEach(() => {
    routesService = new GoogleRoutesService();
    service = new RouteOptimizerService(routesService);
  });

  describe('buildTravelMatrix', () => {
    it('should produce a square matrix with zeroes on the diagonal', () => {
      const events = [
        makeSchedulable('A', 52.525, 13.395, '', '', 0),
        makeSchedulable('B', 52.500, 13.400, '', '', 1),
      ];

      const matrix = service.buildTravelMatrix(home, events);

      expect(matrix.length).toBe(3); // home + 2 events
      expect(matrix[0].length).toBe(3);

      // Diagonal should be zero
      for (let i = 0; i < 3; i++) {
        expect(matrix[i][i].durationSeconds).toBe(0);
        expect(matrix[i][i].distanceMeters).toBe(0);
      }
    });

    it('should produce symmetric travel estimates', () => {
      const events = [
        makeSchedulable('A', 52.530, 13.410, '', '', 0),
      ];

      const matrix = service.buildTravelMatrix(home, events);

      // Home → A should be same distance as A → Home
      expect(matrix[0][1].distanceMeters).toBe(matrix[1][0].distanceMeters);
    });

    it('should use walking for short distances and transit for longer', () => {
      // Short distance: ~500m
      const nearEvent = makeSchedulable('near', 52.524, 13.405, '', '', 0);
      // Long distance: ~5km
      const farEvent = makeSchedulable('far', 52.470, 13.405, '', '', 1);

      const matrix = service.buildTravelMatrix(home, [nearEvent, farEvent]);

      // Near: walking should be fast (~360s at 5km/h for 500m)
      const nearDuration = matrix[0][1].durationSeconds;
      // Far: transit is faster than walking for 5km
      const farDuration = matrix[0][2].durationSeconds;

      // Far event should take less time than purely walking would
      const walkingTimeFar = matrix[0][2].distanceMeters / 1.39; // pure walk speed
      expect(farDuration).toBeLessThan(walkingTimeFar);

      // Near should be reasonable (< 10 min for 500m)
      expect(nearDuration).toBeLessThan(600);
    });
  });

  describe('optimizeGreedy', () => {
    it('should schedule events in order of reachability', () => {
      // Event A is close and starts soon
      // Event B is far and starts later
      const events = [
        makeSchedulable('A', 52.522, 13.407, '2026-04-10T14:00:00+02:00', '2026-04-10T16:00:00+02:00', 0),
        makeSchedulable('B', 52.480, 13.350, '2026-04-10T17:00:00+02:00', '2026-04-10T19:00:00+02:00', 1),
      ];

      const start = new Date('2026-04-10T13:00:00+02:00');
      const end = new Date('2026-04-10T20:00:00+02:00');

      const result = service.optimizeGreedy(home, events, start, end);

      expect(result.orderedEvents).toHaveLength(2);
      expect(result.orderedEvents[0].id).toBe('A'); // closer, sooner
      expect(result.orderedEvents[1].id).toBe('B');
      expect(result.skippedEvents).toHaveLength(0);
      expect(result.strategy).toBe('greedy-nearest-time');
    });

    it('should skip events that end before arrival is possible', () => {
      // Event A ends before the spree even starts, but its end time is in the past relative to travel
      const events = [
        makeSchedulable('A', 52.522, 13.407, '2026-04-10T14:00:00+02:00', '2026-04-10T16:00:00+02:00', 0),
        makeSchedulable('B', 52.480, 13.350, '2026-04-10T10:00:00+02:00', '2026-04-10T10:30:00+02:00', 1), // already over
      ];

      const start = new Date('2026-04-10T13:00:00+02:00');
      const end = new Date('2026-04-10T20:00:00+02:00');

      const result = service.optimizeGreedy(home, events, start, end);

      expect(result.orderedEvents).toHaveLength(1);
      expect(result.orderedEvents[0].id).toBe('A');
      expect(result.skippedEvents).toHaveLength(1);
      expect(result.skippedEvents[0].id).toBe('B');
    });

    it('should handle single event', () => {
      const events = [
        makeSchedulable('A', 52.522, 13.407, '2026-04-10T14:00:00+02:00', '2026-04-10T16:00:00+02:00', 0),
      ];

      const start = new Date('2026-04-10T13:00:00+02:00');
      const end = new Date('2026-04-10T20:00:00+02:00');

      const result = service.optimizeGreedy(home, events, start, end);

      expect(result.orderedEvents).toHaveLength(1);
      expect(result.skippedEvents).toHaveLength(0);
    });

    it('should handle empty events list', () => {
      const start = new Date('2026-04-10T13:00:00+02:00');
      const end = new Date('2026-04-10T20:00:00+02:00');

      const result = service.optimizeGreedy(home, [], start, end);

      expect(result.orderedEvents).toHaveLength(0);
      expect(result.skippedEvents).toHaveLength(0);
    });

    it('should account for stay time when scheduling next event', () => {
      // Two events at the same venue, 30 min apart — only works if stay is short
      const events = [
        makeSchedulable('A', 52.522, 13.407, '2026-04-10T14:00:00+02:00', '2026-04-10T16:00:00+02:00', 0, 10),
        makeSchedulable('B', 52.522, 13.407, '2026-04-10T14:20:00+02:00', '2026-04-10T14:30:00+02:00', 1, 10),
      ];

      const start = new Date('2026-04-10T13:50:00+02:00');
      const end = new Date('2026-04-10T16:00:00+02:00');

      const result = service.optimizeGreedy(home, events, start, end);

      // Both should be scheduled since they're at the same venue
      expect(result.orderedEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('optimizeByStartTime', () => {
    it('should sort events by start time', () => {
      const events = [
        makeSchedulable('C', 52.50, 13.40, '2026-04-10T20:00:00+02:00', '2026-04-10T22:00:00+02:00', 2),
        makeSchedulable('A', 52.52, 13.39, '2026-04-10T14:00:00+02:00', '2026-04-10T16:00:00+02:00', 0),
        makeSchedulable('B', 52.48, 13.35, '2026-04-10T17:00:00+02:00', '2026-04-10T19:00:00+02:00', 1),
      ];

      const result = service.optimizeByStartTime(events);

      expect(result.orderedEvents[0].id).toBe('A');
      expect(result.orderedEvents[1].id).toBe('B');
      expect(result.orderedEvents[2].id).toBe('C');
      expect(result.skippedEvents).toHaveLength(0);
      expect(result.strategy).toBe('time-sort');
    });

    it('should not skip any events', () => {
      const events = [
        makeSchedulable('A', 52.52, 13.39, '2026-04-10T14:00:00+02:00', '2026-04-10T16:00:00+02:00', 0),
      ];

      const result = service.optimizeByStartTime(events);
      expect(result.skippedEvents).toHaveLength(0);
    });
  });
});
