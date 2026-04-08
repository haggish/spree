import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KulturdatenService } from './kulturdaten.service';
import { KulturdatenApiService } from './kulturdaten-api.service';
import { LocationResolverService } from './location-resolver.service';

// Mock fs for LocationResolverService
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

function makeEvent(id: string, opts: Partial<{
  startTime: string;
  endTime: string;
  locationId: string;
  locationLabel: string;
  attractionId: string;
  attractionLabel: string;
}> = {}) {
  return {
    identifier: id,
    status: 'event.published',
    scheduleStatus: 'event.scheduled',
    schedule: {
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      startTime: opts.startTime || '19:00:00',
      endTime: opts.endTime || '21:00:00',
    },
    locations: [{
      referenceType: 'type.Location',
      referenceId: opts.locationId || 'L_1',
      referenceLabel: { de: opts.locationLabel || 'Venue A' },
    }],
    attractions: [{
      referenceType: 'type.Attraction',
      referenceId: opts.attractionId || 'A_1',
      referenceLabel: { de: opts.attractionLabel || 'Konzert A' },
    }],
  };
}

describe('KulturdatenService', () => {
  let service: KulturdatenService;
  let api: KulturdatenApiService;
  let resolver: LocationResolverService;

  beforeEach(() => {
    api = new KulturdatenApiService();
    resolver = new LocationResolverService();
    service = new KulturdatenService(api, resolver);
  });

  describe('groupId', () => {
    it('should return kulturdaten-berlin', () => {
      expect(service.groupId).toBe('kulturdaten-berlin');
    });
  });

  describe('getEventGroup', () => {
    it('should build an event group from API data', async () => {
      vi.spyOn(api, 'fetchEvents').mockResolvedValue([
        makeEvent('E_1', { locationId: 'L_1', attractionLabel: 'Jazz Night' }),
        makeEvent('E_2', { locationId: 'L_2', attractionLabel: 'Art Opening' }),
      ]);

      vi.spyOn(api, 'fetchLocations').mockResolvedValue(new Map([
        ['L_1', { identifier: 'L_1', title: { de: 'Jazzkeller' }, address: { streetAddress: 'Str 1', postalCode: '10115' } }],
        ['L_2', { identifier: 'L_2', title: { de: 'Galerie' }, address: { streetAddress: 'Str 2', postalCode: '10999' } }],
      ]));

      vi.spyOn(resolver, 'resolve').mockImplementation(async (loc) => ({
        googlePlaceId: `place-${loc.id}`,
        name: loc.name,
        formattedAddress: `${loc.streetAddress}, Berlin`,
        lat: 52.52,
        lng: 13.40,
      }));

      const group = await service.getEventGroup('2026-04-10');

      expect(group.id).toBe('kulturdaten-berlin');
      expect(group.name).toBe('Berlin Cultural Events');
      expect(group.events).toHaveLength(2);
      expect(group.events[0].id).toBe('kd-evt-E_1');
      expect(group.events[0].name).toBe('Jazz Night');
      expect(group.events[0].venue.googlePlaceId).toBe('place-L_1');
      expect(group.events[1].id).toBe('kd-evt-E_2');
    });

    it('should return empty group when no events found', async () => {
      vi.spyOn(api, 'fetchEvents').mockResolvedValue([]);

      const group = await service.getEventGroup('2026-04-10');

      expect(group.events).toHaveLength(0);
    });

    it('should skip events with unresolvable locations (lat/lng 0,0)', async () => {
      vi.spyOn(api, 'fetchEvents').mockResolvedValue([
        makeEvent('E_1', { locationId: 'L_BAD' }),
      ]);

      vi.spyOn(api, 'fetchLocations').mockResolvedValue(new Map([
        ['L_BAD', { identifier: 'L_BAD', title: { de: 'Unknown' } }],
      ]));

      vi.spyOn(resolver, 'resolve').mockResolvedValue({
        googlePlaceId: 'kd-L_BAD',
        name: 'Unknown',
        formattedAddress: 'Berlin, Germany',
        lat: 0,
        lng: 0,
      });

      const group = await service.getEventGroup('2026-04-10');
      expect(group.events).toHaveLength(0);
    });

    it('should use cached result within TTL', async () => {
      vi.spyOn(api, 'fetchEvents').mockResolvedValue([
        makeEvent('E_1'),
      ]);
      vi.spyOn(api, 'fetchLocations').mockResolvedValue(new Map([
        ['L_1', { identifier: 'L_1', title: { de: 'Venue' }, address: { streetAddress: 'Str 1' } }],
      ]));
      vi.spyOn(resolver, 'resolve').mockResolvedValue({
        googlePlaceId: 'place-L_1',
        name: 'Venue',
        formattedAddress: 'Str 1, Berlin',
        lat: 52.52,
        lng: 13.40,
      });

      await service.getEventGroup('2026-04-10');
      await service.getEventGroup('2026-04-10');

      // API should only be called once
      expect(api.fetchEvents).toHaveBeenCalledTimes(1);
    });

    it('should re-fetch for a different date', async () => {
      vi.spyOn(api, 'fetchEvents').mockResolvedValue([]);

      await service.getEventGroup('2026-04-10');
      await service.getEventGroup('2026-04-11');

      expect(api.fetchEvents).toHaveBeenCalledTimes(2);
    });
  });

  describe('ISO time construction', () => {
    it('should produce Berlin timezone timestamps', async () => {
      vi.spyOn(api, 'fetchEvents').mockResolvedValue([
        makeEvent('E_TIME', { startTime: '14:30:00', endTime: '16:00:00' }),
      ]);
      vi.spyOn(api, 'fetchLocations').mockResolvedValue(new Map([
        ['L_1', { identifier: 'L_1', title: { de: 'Venue' }, address: { streetAddress: 'Str 1' } }],
      ]));
      vi.spyOn(resolver, 'resolve').mockResolvedValue({
        googlePlaceId: 'place-L_1',
        name: 'Venue',
        formattedAddress: 'Berlin',
        lat: 52.52,
        lng: 13.40,
      });

      const group = await service.getEventGroup('2026-04-10');

      expect(group.events[0].startTime).toBe('2026-04-10T14:30:00+02:00');
      expect(group.events[0].endTime).toBe('2026-04-10T16:00:00+02:00');
    });

    it('should default end time to start + 2h when end is 00:00:00', async () => {
      vi.spyOn(api, 'fetchEvents').mockResolvedValue([
        makeEvent('E_NOEND', { startTime: '19:00:00', endTime: '00:00:00' }),
      ]);
      vi.spyOn(api, 'fetchLocations').mockResolvedValue(new Map([
        ['L_1', { identifier: 'L_1', title: { de: 'Venue' }, address: { streetAddress: 'Str 1' } }],
      ]));
      vi.spyOn(resolver, 'resolve').mockResolvedValue({
        googlePlaceId: 'place-L_1',
        name: 'Venue',
        formattedAddress: 'Berlin',
        lat: 52.52,
        lng: 13.40,
      });

      const group = await service.getEventGroup('2026-04-10');

      expect(group.events[0].endTime).toBe('2026-04-10T21:00:00+02:00');
    });
  });

  describe('getSummary', () => {
    it('should return summary with event count and time bounds', async () => {
      vi.spyOn(api, 'fetchEvents').mockResolvedValue([
        makeEvent('E_EARLY', { startTime: '10:00:00', endTime: '12:00:00' }),
        makeEvent('E_LATE', { startTime: '20:00:00', endTime: '23:00:00', locationId: 'L_2' }),
      ]);
      vi.spyOn(api, 'fetchLocations').mockResolvedValue(new Map([
        ['L_1', { identifier: 'L_1', title: { de: 'A' }, address: { streetAddress: 'S1' } }],
        ['L_2', { identifier: 'L_2', title: { de: 'B' }, address: { streetAddress: 'S2' } }],
      ]));
      vi.spyOn(resolver, 'resolve').mockImplementation(async (loc) => ({
        googlePlaceId: `place-${loc.id}`,
        name: loc.name,
        formattedAddress: 'Berlin',
        lat: 52.52,
        lng: 13.40,
      }));

      const summary = await service.getSummary();

      expect(summary.id).toBe('kulturdaten-berlin');
      expect(summary.name).toBe('Berlin Cultural Events');
      expect(summary.eventCount).toBe(2);
      expect(summary.earliestStart).toBe('2026-04-10T10:00:00+02:00');
      expect(summary.latestEnd).toBe('2026-04-10T23:00:00+02:00');
    });
  });
});