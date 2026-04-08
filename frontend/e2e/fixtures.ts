/**
 * Shared mock data for E2E tests.
 * Matches the backend's actual response shapes.
 */

export const mockEventGroups = [
  {
    id: 'berlin-music-day',
    name: 'Berlin Music Day',
    eventCount: 3,
    earliestStart: '2026-04-05T10:00:00+02:00',
    latestEnd: '2026-04-05T23:00:00+02:00',
  },
  {
    id: 'berlin-arts-culture',
    name: 'Berlin Arts & Culture',
    eventCount: 2,
    earliestStart: '2026-04-05T11:00:00+02:00',
    latestEnd: '2026-04-05T22:30:00+02:00',
  },
];

const venue1 = {
  id: 'ven-001',
  name: 'Berghain',
  address: 'Am Wriezener Bhf, 10243 Berlin',
  location: { lat: 52.5112, lng: 13.4428 },
  googlePlaceId: 'ChIJLwkJQIFRqEcRKMNFm2MRAgM',
};

const venue2 = {
  id: 'ven-002',
  name: 'Astra Kulturhaus',
  address: 'Revaler Str. 99, 10245 Berlin',
  location: { lat: 52.5074, lng: 13.4543 },
  googlePlaceId: 'ChIJRzVfM3xRqEcRvHvMpD_UQgs',
};

const venue3 = {
  id: 'ven-003',
  name: 'Tempodrom',
  address: 'Möckernstraße 10, 10963 Berlin',
  location: { lat: 52.4986, lng: 13.3830 },
  googlePlaceId: 'ChIJ7wRIGqJRqEcRqCWDaHZiAQQ',
};

export const mockEvents = [
  {
    id: 'evt-001',
    name: 'Berlin Electronic Showcase',
    presenter: 'DJ Stellar',
    description: 'Underground electronic music showcase.',
    venueId: 'ven-001',
    startTime: '2026-04-05T14:00:00+02:00',
    endTime: '2026-04-05T18:00:00+02:00',
    venue: venue1,
  },
  {
    id: 'evt-002',
    name: 'Indie Rock Night',
    presenter: 'The Wanderers',
    description: 'An evening of raw indie rock.',
    venueId: 'ven-002',
    startTime: '2026-04-05T19:00:00+02:00',
    endTime: '2026-04-05T23:00:00+02:00',
    venue: venue2,
  },
  {
    id: 'evt-005',
    name: 'Jazz & Soul Brunch',
    presenter: 'Mira Santos Quartet',
    description: 'Smooth jazz and soul.',
    venueId: 'ven-003',
    startTime: '2026-04-05T10:00:00+02:00',
    endTime: '2026-04-05T13:00:00+02:00',
    venue: venue3,
  },
];

export const mockEventGroup = {
  id: 'berlin-music-day',
  name: 'Berlin Music Day',
  events: mockEvents,
};

export const mockSpreePlan = {
  homeLocation: { lat: 52.520, lng: 13.405 },
  startTime: '2026-04-05T10:00:00+02:00',
  endTime: '2026-04-05T23:00:00+02:00',
  legs: [
    {
      order: 1,
      event: mockEvents[2], // Jazz
      travelFromPrevious: {
        fromLabel: 'Home',
        fromLocation: { lat: 52.520, lng: 13.405 },
        toLabel: 'Tempodrom',
        toLocation: { lat: 52.4986, lng: 13.3830 },
        travelMode: 'WALK',
        distanceMeters: 2800,
        durationSeconds: 2016,
        polyline: '',
      },
      arrivalTime: '2026-04-05T10:00:00.000Z',
      departureTime: '2026-04-05T10:10:00.000Z',
      stayMinutes: 10,
      idleWaitMinutes: 0,
      exceedsWindow: false,
    },
    {
      order: 2,
      event: mockEvents[0], // Electronic
      travelFromPrevious: {
        fromLabel: 'Tempodrom',
        fromLocation: { lat: 52.4986, lng: 13.3830 },
        toLabel: 'Berghain',
        toLocation: { lat: 52.5112, lng: 13.4428 },
        travelMode: 'TRANSIT',
        distanceMeters: 5200,
        durationSeconds: 1048,
        polyline: '',
        transitDetails: [
          { transitType: 'BUS', lineName: 'M29', departureStop: 'Möckernbrücke', arrivalStop: 'Warschauer Str.' },
        ],
      },
      arrivalTime: '2026-04-05T14:00:00.000Z',
      departureTime: '2026-04-05T14:10:00.000Z',
      stayMinutes: 10,
      idleWaitMinutes: 218,
      exceedsWindow: false,
    },
  ],
  totalDurationMinutes: 250,
  exceedsEndTime: false,
  stats: {
    strategy: 'greedy-nearest-time',
    totalTravelMinutes: 51,
    totalIdleMinutes: 218,
    totalStayMinutes: 20,
    eventsScheduled: 2,
    eventsSkipped: 0,
  },
  skippedEvents: [],
};
