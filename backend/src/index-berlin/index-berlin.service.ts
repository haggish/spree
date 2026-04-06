import { Injectable, Logger } from '@nestjs/common';
import { EventGroup, EventGroupSummary, EventWithVenue, Venue, Event } from '../common/interfaces';
import { IndexBerlinScraperService, IndexBerlinEvent, IndexBerlinVenue } from './index-berlin-scraper.service';
import { VenueResolverService, ResolvedVenue } from './venue-resolver.service';

const GROUP_ID = 'index-berlin-openings';
const GROUP_NAME = 'Index Berlin Gallery Openings';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class IndexBerlinService {
  private readonly logger = new Logger(IndexBerlinService.name);
  private readonly ttlMs: number;

  private cachedGroup: EventGroup | null = null;
  private cachedAt = 0;

  constructor(
    private readonly scraper: IndexBerlinScraperService,
    private readonly venueResolver: VenueResolverService,
  ) {
    this.ttlMs = parseInt(process.env['INDEX_BERLIN_CACHE_TTL_MS'] || '', 10) || DEFAULT_TTL_MS;
  }

  get groupId(): string {
    return GROUP_ID;
  }

  async getEventGroup(): Promise<EventGroup> {
    if (this.cachedGroup && Date.now() - this.cachedAt < this.ttlMs) {
      return this.cachedGroup;
    }

    this.logger.log('Refreshing Index Berlin data...');

    // Scrape events and venues in parallel
    const [rawEvents, rawVenues] = await Promise.all([
      this.scraper.scrapeEvents(),
      this.scraper.scrapeVenues(),
    ]);

    // Build a venue lookup from scraped data
    const venueMap = new Map<string, IndexBerlinVenue>();
    for (const v of rawVenues) {
      venueMap.set(v.id, v);
    }

    // Collect unique venue IDs referenced by events
    const referencedVenueIds = new Set(rawEvents.map((e) => e.venueId));

    // Resolve each referenced venue to a Google Place ID
    const resolvedVenues = new Map<string, ResolvedVenue>();
    for (const venueId of referencedVenueIds) {
      const scraped = venueMap.get(venueId);
      // Use venue data from venue list if available, otherwise fall back to event's lat/lng
      const eventWithVenue = rawEvents.find((e) => e.venueId === venueId);
      const venueData = scraped || {
        id: venueId,
        name: eventWithVenue?.venueName || `Venue ${venueId}`,
        lat: eventWithVenue?.lat || 0,
        lng: eventWithVenue?.lng || 0,
      };

      const resolved = await this.venueResolver.resolve(venueData);
      if (resolved) {
        resolvedVenues.set(venueId, resolved);
      }
    }

    // Build domain events
    const events: EventWithVenue[] = [];
    for (const raw of rawEvents) {
      const resolved = resolvedVenues.get(raw.venueId);
      if (!resolved) continue;

      const venue: Venue = {
        id: resolved.googlePlaceId,
        name: resolved.name,
        address: resolved.formattedAddress,
        location: { lat: resolved.lat, lng: resolved.lng },
        googlePlaceId: resolved.googlePlaceId,
      };

      const event: Event = {
        id: `ib-evt-${raw.id}`,
        name: raw.title,
        presenter: raw.venueName || resolved.name,
        description: `Gallery opening at ${resolved.name}`,
        venueId: resolved.googlePlaceId,
        startTime: raw.startTime,
        endTime: raw.endTime,
      };

      events.push({ ...event, venue });
    }

    this.logger.log(`Built event group with ${events.length} events across ${resolvedVenues.size} venues`);

    this.cachedGroup = { id: GROUP_ID, name: GROUP_NAME, events };
    this.cachedAt = Date.now();
    return this.cachedGroup;
  }

  async getSummary(): Promise<EventGroupSummary> {
    const group = await this.getEventGroup();
    const starts = group.events.map((e) => e.startTime).sort();
    const ends = group.events.map((e) => e.endTime).sort();

    return {
      id: GROUP_ID,
      name: GROUP_NAME,
      eventCount: group.events.length,
      earliestStart: starts[0] || '',
      latestEnd: ends[ends.length - 1] || '',
    };
  }
}
