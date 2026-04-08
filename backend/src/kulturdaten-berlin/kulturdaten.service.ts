import { Injectable, Logger } from '@nestjs/common';
import { EventGroup, EventGroupSummary, EventWithVenue, Venue, Event } from '../common/interfaces';
import { KulturdatenApiService, KulturdatenEvent, KulturdatenLocation } from './kulturdaten-api.service';
import { LocationResolverService, ResolvedLocation } from './location-resolver.service';

const GROUP_ID = 'kulturdaten-berlin';
const GROUP_NAME = 'Berlin Cultural Events';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class KulturdatenService {
  private readonly logger = new Logger(KulturdatenService.name);
  private readonly ttlMs: number;

  private cachedGroup: EventGroup | null = null;
  private cachedDate: string | null = null;
  private cachedAt = 0;

  constructor(
    private readonly api: KulturdatenApiService,
    private readonly locationResolver: LocationResolverService,
  ) {
    this.ttlMs = parseInt(process.env['KULTURDATEN_CACHE_TTL_MS'] || '', 10) || DEFAULT_TTL_MS;
  }

  get groupId(): string {
    return GROUP_ID;
  }

  /**
   * Get event group for a specific date. Results are cached per date with TTL.
   * If no date given, uses today (Berlin time).
   */
  async getEventGroup(date?: string): Promise<EventGroup> {
    const targetDate = date || this.todayBerlin();

    if (
      this.cachedGroup &&
      this.cachedDate === targetDate &&
      Date.now() - this.cachedAt < this.ttlMs
    ) {
      return this.cachedGroup;
    }

    this.logger.log(`Refreshing Kulturdaten Berlin data for ${targetDate}...`);

    // Fetch events for the target date
    const rawEvents = await this.api.fetchEvents(targetDate, targetDate);

    if (rawEvents.length === 0) {
      const empty: EventGroup = { id: GROUP_ID, name: GROUP_NAME, events: [] };
      this.cachedGroup = empty;
      this.cachedDate = targetDate;
      this.cachedAt = Date.now();
      return empty;
    }

    // Collect unique location IDs
    const locationIds = new Set<string>();
    for (const evt of rawEvents) {
      for (const loc of evt.locations) {
        locationIds.add(loc.referenceId);
      }
    }

    // Fetch all referenced locations in parallel
    const locationDetails = await this.api.fetchLocations([...locationIds]);

    // Resolve locations to Google Place IDs in parallel
    const resolveEntries = [...locationDetails.entries()].map(([id, loc]) => ({
      id,
      loc,
    }));

    const resolvedResults = await Promise.all(
      resolveEntries.map(({ id, loc }) =>
        this.locationResolver.resolve({
          id,
          name: this.localizedText(loc.title),
          streetAddress: loc.address?.streetAddress,
          postalCode: loc.address?.postalCode,
          lat: loc.coordinates?.latitude ? parseFloat(loc.coordinates.latitude) : undefined,
          lng: loc.coordinates?.longitude ? parseFloat(loc.coordinates.longitude) : undefined,
        }),
      ),
    );

    const resolvedLocations = new Map<string, ResolvedLocation>();
    resolveEntries.forEach(({ id }, i) => {
      if (resolvedResults[i]) resolvedLocations.set(id, resolvedResults[i]!);
    });

    // Build domain events
    const events: EventWithVenue[] = [];
    for (const raw of rawEvents) {
      const locationRef = raw.locations[0];
      const resolved = resolvedLocations.get(locationRef.referenceId);
      if (!resolved) continue;

      // Skip locations that couldn't be geocoded (no coords)
      if (resolved.lat === 0 && resolved.lng === 0) continue;

      const venue: Venue = {
        id: resolved.googlePlaceId,
        name: resolved.name,
        address: resolved.formattedAddress,
        location: { lat: resolved.lat, lng: resolved.lng },
        googlePlaceId: resolved.googlePlaceId,
      };

      const attractionLabel = raw.attractions[0]
        ? this.localizedText(raw.attractions[0].referenceLabel)
        : 'Cultural Event';
      const locationLabel = this.localizedText(locationRef.referenceLabel);

      const { startTime, endTime } = this.buildIsoTimes(raw);

      const event: Event = {
        id: `kd-evt-${raw.identifier}`,
        name: attractionLabel,
        presenter: locationLabel,
        description: `${attractionLabel} at ${locationLabel}`,
        venueId: resolved.googlePlaceId,
        startTime,
        endTime,
      };

      events.push({ ...event, venue });
    }

    this.logger.log(`Built event group with ${events.length} events across ${resolvedLocations.size} locations`);

    this.cachedGroup = { id: GROUP_ID, name: GROUP_NAME, events };
    this.cachedDate = targetDate;
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

  private buildIsoTimes(raw: KulturdatenEvent): { startTime: string; endTime: string } {
    const date = raw.schedule.startDate;
    const start = raw.schedule.startTime || '19:00:00';
    let end = raw.schedule.endTime || '';

    // If no end time or same as start, default to start + 2 hours
    if (!end || end === start || end === '00:00:00') {
      const [h, m, s] = start.split(':').map(Number);
      const endH = String(Math.min(h + 2, 23)).padStart(2, '0');
      end = `${endH}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // Use Berlin timezone offset (+02:00 CEST for April)
    return {
      startTime: `${date}T${start}+02:00`,
      endTime: `${raw.schedule.endDate || date}T${end}+02:00`,
    };
  }

  private localizedText(labels: Record<string, string>): string {
    return labels['de'] || labels['en'] || Object.values(labels)[0] || '';
  }

  private todayBerlin(): string {
    const now = new Date();
    // Berlin is UTC+1 (CET) or UTC+2 (CEST). Approximate with +2 for April.
    const berlin = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return berlin.toISOString().slice(0, 10);
  }
}