import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndexBerlinService } from './index-berlin.service';
import { IndexBerlinScraperService } from './index-berlin-scraper.service';
import { VenueResolverService } from './venue-resolver.service';

vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

function makeRawEvent(id: string, venueId: string, venueName: string) {
  return {
    id,
    title: `Event ${id}`,
    venueId,
    venueName,
    lat: 52.52,
    lng: 13.40,
    startTime: '2026-04-10T19:00:00+02:00',
    endTime: '2026-04-10T21:00:00+02:00',
  };
}

function makeRawVenue(id: string, name: string) {
  return {
    id,
    name,
    lat: 52.52,
    lng: 13.40,
    slug: name.toLowerCase().replace(/\s/g, '-'),
  };
}

describe('IndexBerlinService', () => {
  let service: IndexBerlinService;
  let scraper: IndexBerlinScraperService;
  let resolver: VenueResolverService;

  beforeEach(() => {
    scraper = new IndexBerlinScraperService();
    resolver = new VenueResolverService();
    service = new IndexBerlinService(scraper, resolver);
  });

  describe('groupId', () => {
    it('should return index-berlin-openings', () => {
      expect(service.groupId).toBe('index-berlin-openings');
    });
  });

  describe('getEventGroup', () => {
    it('should build event group from scraped data', async () => {
      vi.spyOn(scraper, 'scrapeEvents').mockResolvedValue([
        makeRawEvent('1', '101', 'Galerie A'),
        makeRawEvent('2', '102', 'Galerie B'),
      ]);
      vi.spyOn(scraper, 'scrapeVenues').mockResolvedValue([
        makeRawVenue('101', 'Galerie A'),
        makeRawVenue('102', 'Galerie B'),
      ]);
      vi.spyOn(resolver, 'resolve').mockImplementation(async (v) => ({
        googlePlaceId: `place-${v.id}`,
        name: v.name,
        formattedAddress: 'Berlin',
        lat: v.lat,
        lng: v.lng,
      }));

      const group = await service.getEventGroup();

      expect(group.id).toBe('index-berlin-openings');
      expect(group.name).toBe('Index Berlin Gallery Openings');
      expect(group.events).toHaveLength(2);
      expect(group.events[0].id).toBe('ib-evt-1');
      expect(group.events[0].venue.googlePlaceId).toBe('place-101');
    });

    it('should skip events whose venue could not be resolved', async () => {
      vi.spyOn(scraper, 'scrapeEvents').mockResolvedValue([
        makeRawEvent('1', '101', 'Galerie A'),
      ]);
      vi.spyOn(scraper, 'scrapeVenues').mockResolvedValue([]);
      vi.spyOn(resolver, 'resolve').mockResolvedValue(null);

      const group = await service.getEventGroup();
      expect(group.events).toHaveLength(0);
    });

    it('should use cached result within TTL', async () => {
      const scrapeSpy = vi.spyOn(scraper, 'scrapeEvents').mockResolvedValue([]);
      vi.spyOn(scraper, 'scrapeVenues').mockResolvedValue([]);

      await service.getEventGroup();
      await service.getEventGroup();

      expect(scrapeSpy).toHaveBeenCalledTimes(1);
    });

    it('should use event data as fallback when venue not in venue list', async () => {
      vi.spyOn(scraper, 'scrapeEvents').mockResolvedValue([
        makeRawEvent('1', '999', 'Unknown Venue'),
      ]);
      vi.spyOn(scraper, 'scrapeVenues').mockResolvedValue([]);
      vi.spyOn(resolver, 'resolve').mockImplementation(async (v) => ({
        googlePlaceId: `place-${v.id}`,
        name: v.name,
        formattedAddress: 'Berlin',
        lat: v.lat,
        lng: v.lng,
      }));

      const group = await service.getEventGroup();

      // Should still resolve using event lat/lng + venue name
      expect(group.events).toHaveLength(1);
      expect(group.events[0].presenter).toBe('Unknown Venue');
    });
  });

  describe('getSummary', () => {
    it('should return summary with correct metadata', async () => {
      vi.spyOn(scraper, 'scrapeEvents').mockResolvedValue([
        { ...makeRawEvent('1', '101', 'A'), startTime: '2026-04-10T18:00:00+02:00', endTime: '2026-04-10T20:00:00+02:00' },
        { ...makeRawEvent('2', '102', 'B'), startTime: '2026-04-10T20:00:00+02:00', endTime: '2026-04-10T23:00:00+02:00' },
      ]);
      vi.spyOn(scraper, 'scrapeVenues').mockResolvedValue([
        makeRawVenue('101', 'A'),
        makeRawVenue('102', 'B'),
      ]);
      vi.spyOn(resolver, 'resolve').mockImplementation(async (v) => ({
        googlePlaceId: `place-${v.id}`,
        name: v.name,
        formattedAddress: 'Berlin',
        lat: v.lat,
        lng: v.lng,
      }));

      const summary = await service.getSummary();

      expect(summary.id).toBe('index-berlin-openings');
      expect(summary.eventCount).toBe(2);
      expect(summary.earliestStart).toBe('2026-04-10T18:00:00+02:00');
      expect(summary.latestEnd).toBe('2026-04-10T23:00:00+02:00');
    });
  });
});
