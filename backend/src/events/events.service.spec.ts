import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventsService } from './events.service';
import { VenuesService } from '../venues/venues.service';
import { EventGroupsService } from '../event-groups/event-groups.service';
import { IndexBerlinService } from '../index-berlin/index-berlin.service';
import { KulturdatenService } from '../kulturdaten-berlin/kulturdaten.service';

describe('EventsService', () => {
  let service: EventsService;
  let venuesService: VenuesService;
  let eventGroupsService: EventGroupsService;
  let indexBerlin: IndexBerlinService;
  let kulturdaten: KulturdatenService;

  beforeEach(() => {
    venuesService = new VenuesService();
    eventGroupsService = new EventGroupsService(venuesService);
    indexBerlin = {
      groupId: 'index-berlin-openings',
      getEventGroup: vi.fn(),
      getSummary: vi.fn(),
    } as any;
    kulturdaten = {
      groupId: 'kulturdaten-berlin',
      getEventGroup: vi.fn(),
      getSummary: vi.fn(),
    } as any;

    service = new EventsService(venuesService, eventGroupsService, indexBerlin, kulturdaten);
  });

  describe('findAll', () => {
    it('should return all static events', () => {
      const events = service.findAll();
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('findById', () => {
    it('should find a static event by ID', () => {
      const event = service.findById('evt-001');
      expect(event).toBeDefined();
      expect(event!.name).toBe('Berlin Electronic Showcase');
    });

    it('should return undefined for unknown ID', () => {
      expect(service.findById('evt-999')).toBeUndefined();
    });
  });

  describe('findByIdWithVenue', () => {
    it('should return static event with venue', async () => {
      const event = await service.findByIdWithVenue('evt-001');
      expect(event).toBeDefined();
      expect(event!.venue).toBeDefined();
      expect(event!.venue.name).toBe('Berghain');
    });

    it('should check Index Berlin when not in static groups', async () => {
      const ibEvent = {
        id: 'ib-evt-42',
        name: 'Gallery Opening',
        presenter: 'Gallery X',
        description: 'Opening',
        venueId: 'gp-1',
        startTime: '2026-04-10T19:00:00+02:00',
        endTime: '2026-04-10T21:00:00+02:00',
        venue: { id: 'gp-1', name: 'Gallery X', address: 'Berlin', location: { lat: 52.52, lng: 13.40 }, googlePlaceId: 'gp-1' },
      };

      vi.mocked(indexBerlin.getEventGroup).mockResolvedValue({
        id: 'index-berlin-openings',
        name: 'IB',
        events: [ibEvent],
      });

      const result = await service.findByIdWithVenue('ib-evt-42');

      expect(result).toBeDefined();
      expect(result!.name).toBe('Gallery Opening');
    });

    it('should check Kulturdaten when not in static or Index Berlin', async () => {
      vi.mocked(indexBerlin.getEventGroup).mockResolvedValue({
        id: 'index-berlin-openings',
        name: 'IB',
        events: [],
      });

      const kdEvent = {
        id: 'kd-evt-E_123',
        name: 'Jazz Night',
        presenter: 'Jazz Club',
        description: 'Jazz',
        venueId: 'place-L_1',
        startTime: '2026-04-10T20:00:00+02:00',
        endTime: '2026-04-10T23:00:00+02:00',
        venue: { id: 'place-L_1', name: 'Jazz Club', address: 'Berlin', location: { lat: 52.52, lng: 13.40 }, googlePlaceId: 'place-L_1' },
      };

      vi.mocked(kulturdaten.getEventGroup).mockResolvedValue({
        id: 'kulturdaten-berlin',
        name: 'KD',
        events: [kdEvent],
      });

      const result = await service.findByIdWithVenue('kd-evt-E_123');

      expect(result).toBeDefined();
      expect(result!.name).toBe('Jazz Night');
    });

    it('should return undefined when event not found anywhere', async () => {
      vi.mocked(indexBerlin.getEventGroup).mockResolvedValue({
        id: 'ib', name: 'IB', events: [],
      });
      vi.mocked(kulturdaten.getEventGroup).mockResolvedValue({
        id: 'kd', name: 'KD', events: [],
      });

      const result = await service.findByIdWithVenue('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should handle Index Berlin failure gracefully', async () => {
      vi.mocked(indexBerlin.getEventGroup).mockRejectedValue(new Error('Scrape failed'));
      vi.mocked(kulturdaten.getEventGroup).mockResolvedValue({
        id: 'kd', name: 'KD', events: [],
      });

      const result = await service.findByIdWithVenue('ib-evt-1');
      expect(result).toBeUndefined();
    });
  });

  describe('findInTimeRange', () => {
    it('should return events overlapping the given range', () => {
      // April 5, 10:00–20:00 should include events in that window
      const events = service.findInTimeRange(
        '2026-04-05T10:00:00+02:00',
        '2026-04-05T20:00:00+02:00',
      );

      expect(events.length).toBeGreaterThan(0);
      for (const ev of events) {
        const evStart = new Date(ev.startTime).getTime();
        const evEnd = new Date(ev.endTime).getTime();
        const rangeStart = new Date('2026-04-05T10:00:00+02:00').getTime();
        const rangeEnd = new Date('2026-04-05T20:00:00+02:00').getTime();
        // Events should overlap with range
        expect(evStart < rangeEnd && evEnd > rangeStart).toBe(true);
      }
    });

    it('should return empty for a range with no events', () => {
      const events = service.findInTimeRange(
        '2026-01-01T00:00:00+02:00',
        '2026-01-01T23:59:00+02:00',
      );
      expect(events).toHaveLength(0);
    });
  });
});
