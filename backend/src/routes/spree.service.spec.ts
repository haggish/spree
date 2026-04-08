import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpreeService } from './spree.service';
import { EventsService } from '../events/events.service';
import { GoogleRoutesService } from './google-routes.service';
import { RouteOptimizerService } from './route-optimizer.service';
import { EventWithVenue, RouteSegment } from '../common/interfaces';

const mockVenue = (id: string, lat: number, lng: number) => ({
  id,
  name: `Venue ${id}`,
  address: 'Berlin',
  location: { lat, lng },
  googlePlaceId: id,
});

const mockEventWithVenue = (id: string, lat: number, lng: number, start: string, end: string): EventWithVenue => ({
  id,
  name: `Event ${id}`,
  presenter: 'P',
  description: 'D',
  venueId: `ven-${id}`,
  startTime: start,
  endTime: end,
  venue: mockVenue(`ven-${id}`, lat, lng),
});

const mockRouteSegment = (durationSeconds: number): RouteSegment => ({
  fromLabel: 'A',
  fromLocation: { lat: 52.52, lng: 13.40 },
  toLabel: 'B',
  toLocation: { lat: 52.53, lng: 13.41 },
  travelMode: 'WALK',
  distanceMeters: 1000,
  durationSeconds,
  polyline: '',
});

describe('SpreeService', () => {
  let service: SpreeService;
  let eventsService: EventsService;
  let googleRoutesService: GoogleRoutesService;
  let routeOptimizer: RouteOptimizerService;

  beforeEach(() => {
    eventsService = {
      findByIdWithVenue: vi.fn(),
    } as any;

    googleRoutesService = {
      computeFastestRoute: vi.fn(),
    } as any;

    routeOptimizer = {
      optimizeGreedy: vi.fn(),
      optimizeByStartTime: vi.fn(),
    } as any;

    service = new SpreeService(eventsService, googleRoutesService, routeOptimizer);
  });

  describe('computeSpreePlan', () => {
    it('should compute a plan with greedy strategy', async () => {
      const evA = mockEventWithVenue('A', 52.525, 13.395, '2026-04-10T14:00:00+02:00', '2026-04-10T16:00:00+02:00');
      const evB = mockEventWithVenue('B', 52.500, 13.400, '2026-04-10T17:00:00+02:00', '2026-04-10T19:00:00+02:00');

      vi.mocked(eventsService.findByIdWithVenue)
        .mockResolvedValueOnce(evA)
        .mockResolvedValueOnce(evB);

      vi.mocked(routeOptimizer.optimizeGreedy).mockReturnValue({
        orderedEvents: [
          { ...evA, stayMinutes: 10, index: 0 },
          { ...evB, stayMinutes: 15, index: 1 },
        ],
        skippedEvents: [],
        strategy: 'greedy-nearest-time',
        totalTravelSeconds: 600,
        totalIdleSeconds: 0,
      });

      vi.mocked(googleRoutesService.computeFastestRoute)
        .mockResolvedValueOnce(mockRouteSegment(300))
        .mockResolvedValueOnce(mockRouteSegment(600));

      const plan = await service.computeSpreePlan({
        homeLocation: { lat: 52.520, lng: 13.405 },
        startTime: '2026-04-10T13:00:00+02:00',
        endTime: '2026-04-10T20:00:00+02:00',
        selections: [
          { eventId: 'A', stayMinutes: 10 },
          { eventId: 'B', stayMinutes: 15 },
        ],
        strategy: 'greedy',
      });

      expect(plan.legs).toHaveLength(2);
      expect(plan.legs[0].order).toBe(1);
      expect(plan.legs[0].event.id).toBe('A');
      expect(plan.legs[0].stayMinutes).toBe(10);
      expect(plan.legs[1].order).toBe(2);
      expect(plan.legs[1].event.id).toBe('B');
      expect(plan.legs[1].stayMinutes).toBe(15);
      expect(plan.stats.strategy).toBe('greedy-nearest-time');
      expect(plan.stats.eventsScheduled).toBe(2);
      expect(plan.stats.eventsSkipped).toBe(0);
    });

    it('should use time-sort strategy when requested', async () => {
      const evA = mockEventWithVenue('A', 52.525, 13.395, '2026-04-10T14:00:00+02:00', '2026-04-10T16:00:00+02:00');

      vi.mocked(eventsService.findByIdWithVenue).mockResolvedValueOnce(evA);

      vi.mocked(routeOptimizer.optimizeByStartTime).mockReturnValue({
        orderedEvents: [{ ...evA, stayMinutes: 10, index: 0 }],
        skippedEvents: [],
        strategy: 'time-sort',
        totalTravelSeconds: 0,
        totalIdleSeconds: 0,
      });

      vi.mocked(googleRoutesService.computeFastestRoute)
        .mockResolvedValueOnce(mockRouteSegment(300));

      const plan = await service.computeSpreePlan({
        homeLocation: { lat: 52.520, lng: 13.405 },
        startTime: '2026-04-10T13:00:00+02:00',
        endTime: '2026-04-10T20:00:00+02:00',
        selections: [{ eventId: 'A', stayMinutes: 10 }],
        strategy: 'time-sort',
      });

      expect(routeOptimizer.optimizeByStartTime).toHaveBeenCalled();
      expect(plan.stats.strategy).toBe('time-sort');
    });

    it('should throw NotFoundException for unknown event', async () => {
      vi.mocked(eventsService.findByIdWithVenue).mockResolvedValue(undefined);

      await expect(
        service.computeSpreePlan({
          homeLocation: { lat: 52.52, lng: 13.40 },
          startTime: '2026-04-10T13:00:00+02:00',
          endTime: '2026-04-10T20:00:00+02:00',
          selections: [{ eventId: 'nonexistent', stayMinutes: 10 }],
          strategy: 'greedy',
        }),
      ).rejects.toThrow('Event nonexistent not found');
    });

    it('should include skipped events in the plan', async () => {
      const evA = mockEventWithVenue('A', 52.525, 13.395, '2026-04-10T14:00:00+02:00', '2026-04-10T16:00:00+02:00');
      const evB = mockEventWithVenue('B', 52.500, 13.400, '2026-04-10T10:00:00+02:00', '2026-04-10T10:30:00+02:00');

      vi.mocked(eventsService.findByIdWithVenue)
        .mockResolvedValueOnce(evA)
        .mockResolvedValueOnce(evB);

      vi.mocked(routeOptimizer.optimizeGreedy).mockReturnValue({
        orderedEvents: [{ ...evA, stayMinutes: 10, index: 0 }],
        skippedEvents: [{ ...evB, stayMinutes: 10, index: 1 }],
        strategy: 'greedy-nearest-time',
        totalTravelSeconds: 300,
        totalIdleSeconds: 0,
      });

      vi.mocked(googleRoutesService.computeFastestRoute)
        .mockResolvedValueOnce(mockRouteSegment(300));

      const plan = await service.computeSpreePlan({
        homeLocation: { lat: 52.52, lng: 13.40 },
        startTime: '2026-04-10T13:00:00+02:00',
        endTime: '2026-04-10T20:00:00+02:00',
        selections: [
          { eventId: 'A', stayMinutes: 10 },
          { eventId: 'B', stayMinutes: 10 },
        ],
        strategy: 'greedy',
      });

      expect(plan.skippedEvents).toHaveLength(1);
      expect(plan.skippedEvents[0].event.id).toBe('B');
      expect(plan.skippedEvents[0].reason).toContain('arrive');
      expect(plan.stats.eventsSkipped).toBe(1);
    });

    it('should calculate idle wait when arriving before event starts', async () => {
      const evA = mockEventWithVenue('A', 52.525, 13.395, '2026-04-10T15:00:00+02:00', '2026-04-10T17:00:00+02:00');

      vi.mocked(eventsService.findByIdWithVenue).mockResolvedValueOnce(evA);

      vi.mocked(routeOptimizer.optimizeGreedy).mockReturnValue({
        orderedEvents: [{ ...evA, stayMinutes: 10, index: 0 }],
        skippedEvents: [],
        strategy: 'greedy-nearest-time',
        totalTravelSeconds: 60,
        totalIdleSeconds: 0,
      });

      // 1 minute travel — arrive at 13:01, event starts at 15:00
      vi.mocked(googleRoutesService.computeFastestRoute)
        .mockResolvedValueOnce(mockRouteSegment(60));

      const plan = await service.computeSpreePlan({
        homeLocation: { lat: 52.52, lng: 13.40 },
        startTime: '2026-04-10T13:00:00+02:00',
        endTime: '2026-04-10T20:00:00+02:00',
        selections: [{ eventId: 'A', stayMinutes: 10 }],
        strategy: 'greedy',
      });

      // Should have idle wait (arrive at 13:01, event at 15:00)
      expect(plan.legs[0].idleWaitMinutes).toBeGreaterThan(0);
      // Arrival time should be the event start, not travel arrival
      expect(plan.legs[0].arrivalTime).toContain('2026-04-10');
    });

    it('should flag legs that exceed the spree window', async () => {
      const evA = mockEventWithVenue('A', 52.525, 13.395, '2026-04-10T19:00:00+02:00', '2026-04-10T21:00:00+02:00');

      vi.mocked(eventsService.findByIdWithVenue).mockResolvedValueOnce(evA);

      vi.mocked(routeOptimizer.optimizeGreedy).mockReturnValue({
        orderedEvents: [{ ...evA, stayMinutes: 30, index: 0 }],
        skippedEvents: [],
        strategy: 'greedy-nearest-time',
        totalTravelSeconds: 0,
        totalIdleSeconds: 0,
      });

      vi.mocked(googleRoutesService.computeFastestRoute)
        .mockResolvedValueOnce(mockRouteSegment(60));

      const plan = await service.computeSpreePlan({
        homeLocation: { lat: 52.52, lng: 13.40 },
        startTime: '2026-04-10T18:00:00+02:00',
        endTime: '2026-04-10T19:10:00+02:00', // very tight window
        selections: [{ eventId: 'A', stayMinutes: 30 }],
        strategy: 'greedy',
      });

      // Departure (19:00 + 30min stay = 19:30) exceeds end time (19:10)
      expect(plan.legs[0].exceedsWindow).toBe(true);
      expect(plan.exceedsEndTime).toBe(true);
    });

    it('should handle empty selections', async () => {
      vi.mocked(routeOptimizer.optimizeGreedy).mockReturnValue({
        orderedEvents: [],
        skippedEvents: [],
        strategy: 'greedy-nearest-time',
        totalTravelSeconds: 0,
        totalIdleSeconds: 0,
      });

      const plan = await service.computeSpreePlan({
        homeLocation: { lat: 52.52, lng: 13.40 },
        startTime: '2026-04-10T13:00:00+02:00',
        endTime: '2026-04-10T20:00:00+02:00',
        selections: [],
        strategy: 'greedy',
      });

      expect(plan.legs).toHaveLength(0);
      expect(plan.totalDurationMinutes).toBe(0);
      expect(plan.exceedsEndTime).toBe(false);
    });
  });
});
