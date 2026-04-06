// ── Geographic coordinate ──
export interface LatLng {
  lat: number;
  lng: number;
}

// ── Venue ──
export interface Venue {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  googlePlaceId: string;
}

// ── Event ──
export interface SpreeEvent {
  id: string;
  name: string;
  presenter: string;
  description: string;
  venueId: string;
  startTime: string;
  endTime: string;
}

// ── Event with venue resolved ──
export interface EventWithVenue extends SpreeEvent {
  venue: Venue;
}

// ── Route segment between two locations ──
export interface RouteSegment {
  fromLabel: string;
  fromLocation: LatLng;
  toLabel: string;
  toLocation: LatLng;
  travelMode: string;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
}

// ── User's selection of an event to attend ──
export interface SpreeSelection {
  eventId: string;
  stayMinutes: number;
}

// ── A single leg of the computed spree ──
export interface SpreeLeg {
  order: number;
  event: EventWithVenue;
  travelFromPrevious: RouteSegment;
  arrivalTime: string;
  departureTime: string;
  stayMinutes: number;
  idleWaitMinutes: number;
  exceedsWindow: boolean;
}

// ── Optimization statistics ──
export interface SpreePlanStats {
  strategy: string;
  totalTravelMinutes: number;
  totalIdleMinutes: number;
  totalStayMinutes: number;
  eventsScheduled: number;
  eventsSkipped: number;
}

// ── Skipped event ──
export interface SkippedEvent {
  event: EventWithVenue;
  reason: string;
}

// ── The complete spree plan ──
export interface SpreePlan {
  homeLocation: LatLng;
  startTime: string;
  endTime: string;
  legs: SpreeLeg[];
  totalDurationMinutes: number;
  exceedsEndTime: boolean;
  stats: SpreePlanStats;
  skippedEvents: SkippedEvent[];
}

// ── Event group summary (for listing) ──
export interface EventGroupSummary {
  id: string;
  name: string;
  eventCount: number;
  earliestStart: string;
  latestEnd: string;
}

// ── Event group with resolved events ──
export interface EventGroup {
  id: string;
  name: string;
  events: EventWithVenue[];
}

// ── Request body to compute a spree ──
export interface ComputeSpreeRequest {
  homeLocation: LatLng;
  startTime: string;
  endTime: string;
  selections: SpreeSelection[];
  travelMode: string;
  strategy: string;
}

// ── Spree configuration (UI state) ──
export interface SpreeConfig {
  homeLocation: LatLng;
  homeLabel: string;
  startTime: string;
  endTime: string;
  travelMode: string;
  strategy: string;
}
