// ── Geographic coordinate ──
export interface LatLng {
  lat: number;
  lng: number;
}

// ── Venue: a physical place tied to a Google Place ID ──
export interface Venue {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  googlePlaceId: string;
}

// ── Event: something happening at a venue within a time window ──
export interface Event {
  id: string;
  name: string;
  presenter: string;
  description: string;
  venueId: string;
  startTime: string;   // ISO 8601
  endTime: string;      // ISO 8601
}

// ── Event with its venue resolved ──
export interface EventWithVenue extends Event {
  venue: Venue;
}

// ── Transit step detail (bus, tram, subway, etc.) ──
export interface TransitDetail {
  transitType: string;        // BUS, SUBWAY, TRAM, RAIL, etc.
  lineName: string;           // e.g. "M19", "U2"
  departureStop: string;      // stop name
  arrivalStop: string;        // stop name
}

// ── A single leg of the spree route ──
export interface RouteSegment {
  fromLabel: string;
  fromLocation: LatLng;
  toLabel: string;
  toLocation: LatLng;
  travelMode: google.maps.TravelMode | string;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;           // encoded polyline from Routes API
  transitDetails?: TransitDetail[];  // present when travelMode is TRANSIT
}

// ── Selection: an event the user picked + how long they'll stay ──
export interface SpreeSelection {
  eventId: string;
  stayMinutes: number;        // default 10
}

// ── Optimization statistics ──
export interface SpreePlanStats {
  strategy: string;               // e.g. 'greedy-nearest-time'
  totalTravelMinutes: number;
  totalIdleMinutes: number;
  totalStayMinutes: number;
  eventsScheduled: number;
  eventsSkipped: number;
}

// ── An event that couldn't be reached in time ──
export interface SkippedEvent {
  event: EventWithVenue;
  reason: string;
}

// ── The computed spree plan ──
export interface SpreePlan {
  homeLocation: LatLng;
  startTime: string;          // ISO 8601
  endTime: string;            // ISO 8601
  legs: SpreeLeg[];
  totalDurationMinutes: number;
  exceedsEndTime: boolean;    // true → show warning
  stats: SpreePlanStats;
  skippedEvents: SkippedEvent[];
}

// ── One step in the spree: travel + attend ──
export interface SpreeLeg {
  order: number;
  event: EventWithVenue;
  travelFromPrevious: RouteSegment;
  arrivalTime: string;        // ISO 8601 — when user arrives
  departureTime: string;      // ISO 8601 — when user leaves (arrival + stay)
  stayMinutes: number;
  idleWaitMinutes: number;    // time spent waiting for event to start
  exceedsWindow: boolean;     // true if this leg departs after spree end time
}

// ── Event group summary (for listing) ──
export interface EventGroupSummary {
  id: string;
  name: string;
  eventCount: number;
  earliestStart: string; // ISO 8601
  latestEnd: string;     // ISO 8601
}

// ── Event group with resolved events ──
export interface EventGroup {
  id: string;
  name: string;
  events: EventWithVenue[];
}

// ── Google Routes API types (subset we use) ──
export declare namespace google.maps {
  enum TravelMode {
    DRIVE = 'DRIVE',
    WALK = 'WALK',
    BICYCLE = 'BICYCLE',
    TRANSIT = 'TRANSIT',
  }
}
