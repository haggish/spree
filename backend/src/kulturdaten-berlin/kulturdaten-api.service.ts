import { Injectable, Logger } from '@nestjs/common';

// ── API response types ──

export interface KulturdatenEvent {
  identifier: string;
  status: string;
  scheduleStatus: string;
  schedule: {
    startDate: string; // YYYY-MM-DD
    endDate: string;
    startTime: string; // HH:MM:SS
    endTime: string;
  };
  attractions: KulturdatenReference[];
  locations: KulturdatenReference[];
}

export interface KulturdatenReference {
  referenceType: string;
  referenceId: string;
  referenceLabel: Record<string, string>; // { de: "...", en: "..." }
}

export interface KulturdatenLocation {
  identifier: string;
  title: Record<string, string>;
  address?: {
    streetAddress?: string;
    postalCode?: string;
    addressLocality?: string;
  };
  borough?: string;
  coordinates?: {
    latitude?: string;
    longitude?: string;
  };
}

export interface KulturdatenAttraction {
  identifier: string;
  title: Record<string, string>;
  description?: Record<string, string>;
  tags?: string[];
}

interface PaginatedEventsResponse {
  success: boolean;
  data: {
    page: number;
    pageSize: number;
    totalCount: number;
    events: KulturdatenEvent[];
  };
}

interface PaginatedLocationsResponse {
  success: boolean;
  data: {
    page: number;
    pageSize: number;
    totalCount: number;
    locations: KulturdatenLocation[];
  };
}

const BASE_URL = 'https://api-v2.kulturdaten.berlin/api';

@Injectable()
export class KulturdatenApiService {
  private readonly logger = new Logger(KulturdatenApiService.name);

  /**
   * Fetch events within a date range. Returns up to 500 events per page.
   */
  async fetchEvents(startDate: string, endDate: string): Promise<KulturdatenEvent[]> {
    const url = `${BASE_URL}/events?startDate=${startDate}&endDate=${endDate}&pageSize=500&inFuture=false`;
    this.logger.log(`Fetching events: ${startDate} → ${endDate}`);

    try {
      const res = await fetch(url);
      const json = (await res.json()) as PaginatedEventsResponse;

      if (!json.success || !json.data?.events) {
        this.logger.warn('Unexpected API response for events');
        return [];
      }

      // Filter to published, scheduled events with valid times (skip all-day)
      const events = json.data.events.filter(
        (e) =>
          e.status === 'event.published' &&
          e.scheduleStatus === 'event.scheduled' &&
          e.schedule.startTime !== '00:00:00' &&
          e.locations.length > 0 &&
          e.attractions.length > 0,
      );

      this.logger.log(`Fetched ${json.data.totalCount} total, ${events.length} usable events`);
      return events;
    } catch (err) {
      this.logger.error(`Failed to fetch events: ${err}`);
      return [];
    }
  }

  /**
   * Fetch a single location by its identifier.
   */
  async fetchLocation(id: string): Promise<KulturdatenLocation | null> {
    try {
      const res = await fetch(`${BASE_URL}/locations/${id}`);
      const json = await res.json();
      if (!json.success) return null;
      return json.data as KulturdatenLocation;
    } catch (err) {
      this.logger.warn(`Failed to fetch location ${id}: ${err}`);
      return null;
    }
  }

  /**
   * Fetch multiple locations in parallel.
   */
  async fetchLocations(ids: string[]): Promise<Map<string, KulturdatenLocation>> {
    const results = await Promise.all(ids.map((id) => this.fetchLocation(id)));
    const map = new Map<string, KulturdatenLocation>();
    ids.forEach((id, i) => {
      if (results[i]) map.set(id, results[i]!);
    });
    return map;
  }

  /**
   * Fetch a single attraction by its identifier.
   */
  async fetchAttraction(id: string): Promise<KulturdatenAttraction | null> {
    try {
      const res = await fetch(`${BASE_URL}/attractions/${id}`);
      const json = await res.json();
      if (!json.success) return null;
      return json.data as KulturdatenAttraction;
    } catch (err) {
      this.logger.warn(`Failed to fetch attraction ${id}: ${err}`);
      return null;
    }
  }
}
