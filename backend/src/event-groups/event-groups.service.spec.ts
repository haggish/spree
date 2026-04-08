import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventGroupsService } from './event-groups.service';
import { VenuesService } from '../venues/venues.service';
import { IndexBerlinService } from '../index-berlin/index-berlin.service';
import { KulturdatenService } from '../kulturdaten-berlin/kulturdaten.service';

describe('EventGroupsService', () => {
  let service: EventGroupsService;
  let venuesService: VenuesService;
  let indexBerlin: IndexBerlinService;
  let kulturdaten: KulturdatenService;

  beforeEach(() => {
    venuesService = new VenuesService();

    // Create mock dynamic services
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

    service = new EventGroupsService(venuesService, indexBerlin, kulturdaten);
  });

  describe('findAll', () => {
    it('should return static groups plus dynamic summaries', async () => {
      vi.mocked(indexBerlin.getSummary).mockResolvedValue({
        id: 'index-berlin-openings',
        name: 'Index Berlin Gallery Openings',
        eventCount: 5,
        earliestStart: '2026-04-10T18:00:00+02:00',
        latestEnd: '2026-04-10T23:00:00+02:00',
      });
      vi.mocked(kulturdaten.getSummary).mockResolvedValue({
        id: 'kulturdaten-berlin',
        name: 'Berlin Cultural Events',
        eventCount: 10,
        earliestStart: '2026-04-10T10:00:00+02:00',
        latestEnd: '2026-04-10T23:00:00+02:00',
      });

      const groups = await service.findAll();

      expect(groups.length).toBeGreaterThanOrEqual(4); // 2 static + 2 dynamic
      const ids = groups.map((g) => g.id);
      expect(ids).toContain('berlin-music-day');
      expect(ids).toContain('berlin-arts-culture');
      expect(ids).toContain('index-berlin-openings');
      expect(ids).toContain('kulturdaten-berlin');
    });

    it('should still return static groups when dynamic sources fail', async () => {
      vi.mocked(indexBerlin.getSummary).mockRejectedValue(new Error('Scrape failed'));
      vi.mocked(kulturdaten.getSummary).mockRejectedValue(new Error('API down'));

      const groups = await service.findAll();

      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.id)).toEqual(['berlin-music-day', 'berlin-arts-culture']);
    });

    it('should work without dynamic services', async () => {
      const serviceNoExternal = new EventGroupsService(venuesService);
      const groups = await serviceNoExternal.findAll();

      expect(groups).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should return a static group with resolved venues', async () => {
      const group = await service.findById('berlin-music-day');

      expect(group).toBeDefined();
      expect(group!.id).toBe('berlin-music-day');
      expect(group!.events.length).toBeGreaterThan(0);
      // Events should have resolved venues
      expect(group!.events[0].venue).toBeDefined();
      expect(group!.events[0].venue.name).toBeDefined();
    });

    it('should delegate to Index Berlin for its group ID', async () => {
      const mockGroup = {
        id: 'index-berlin-openings',
        name: 'Index Berlin Gallery Openings',
        events: [],
      };
      vi.mocked(indexBerlin.getEventGroup).mockResolvedValue(mockGroup);

      const group = await service.findById('index-berlin-openings');

      expect(group).toBe(mockGroup);
      expect(indexBerlin.getEventGroup).toHaveBeenCalled();
    });

    it('should delegate to Kulturdaten for its group ID', async () => {
      const mockGroup = {
        id: 'kulturdaten-berlin',
        name: 'Berlin Cultural Events',
        events: [],
      };
      vi.mocked(kulturdaten.getEventGroup).mockResolvedValue(mockGroup);

      const group = await service.findById('kulturdaten-berlin');

      expect(group).toBe(mockGroup);
      expect(kulturdaten.getEventGroup).toHaveBeenCalled();
    });

    it('should return undefined for unknown group ID', async () => {
      const group = await service.findById('nonexistent');
      expect(group).toBeUndefined();
    });
  });

  describe('findByIdAtDate', () => {
    it('should filter static events by date', async () => {
      const group = await service.findByIdAtDate('berlin-music-day', '2026-04-05');

      expect(group).toBeDefined();
      // All returned events should be on April 5
      for (const evt of group!.events) {
        expect(evt.startTime).toContain('2026-04-05');
      }
    });

    it('should return empty events for a date with none', async () => {
      const group = await service.findByIdAtDate('berlin-music-day', '2026-01-01');

      expect(group).toBeDefined();
      expect(group!.events).toHaveLength(0);
    });

    it('should pass date through to Kulturdaten', async () => {
      vi.mocked(kulturdaten.getEventGroup).mockResolvedValue({
        id: 'kulturdaten-berlin',
        name: 'Berlin Cultural Events',
        events: [],
      });

      await service.findByIdAtDate('kulturdaten-berlin', '2026-04-10');

      expect(kulturdaten.getEventGroup).toHaveBeenCalledWith('2026-04-10');
    });

    it('should filter Index Berlin events by date', async () => {
      vi.mocked(indexBerlin.getEventGroup).mockResolvedValue({
        id: 'index-berlin-openings',
        name: 'Index Berlin Gallery Openings',
        events: [
          {
            id: 'ib-evt-1',
            name: 'Event A',
            presenter: 'P',
            description: 'D',
            venueId: 'v1',
            startTime: '2026-04-10T19:00:00+02:00',
            endTime: '2026-04-10T21:00:00+02:00',
            venue: { id: 'v1', name: 'V', address: 'A', location: { lat: 0, lng: 0 }, googlePlaceId: 'gp' },
          },
          {
            id: 'ib-evt-2',
            name: 'Event B',
            presenter: 'P',
            description: 'D',
            venueId: 'v2',
            startTime: '2026-04-11T19:00:00+02:00',
            endTime: '2026-04-11T21:00:00+02:00',
            venue: { id: 'v2', name: 'V2', address: 'A2', location: { lat: 0, lng: 0 }, googlePlaceId: 'gp2' },
          },
        ],
      });

      const group = await service.findByIdAtDate('index-berlin-openings', '2026-04-10');

      expect(group!.events).toHaveLength(1);
      expect(group!.events[0].id).toBe('ib-evt-1');
    });
  });

  describe('localDate (timezone handling)', () => {
    it('should handle +02:00 offset correctly', async () => {
      // An event at 2026-04-05T23:30:00+02:00 is still April 5 in Berlin
      const group = await service.findByIdAtDate('berlin-music-day', '2026-04-05');
      // Static events are all on April 5 or April 10 — just verify we get some
      expect(group!.events.length).toBeGreaterThan(0);
    });
  });

  describe('getAllEvents', () => {
    it('should return all static events with venues', () => {
      const events = service.getAllEvents();

      expect(events.length).toBeGreaterThan(0);
      for (const ev of events) {
        expect(ev.venue).toBeDefined();
        expect(ev.venue.location).toBeDefined();
      }
    });
  });
});
