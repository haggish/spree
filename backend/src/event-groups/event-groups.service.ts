import { Injectable, Optional } from '@nestjs/common';
import { Event, EventWithVenue, EventGroupSummary, EventGroup } from '../common/interfaces';
import { VenuesService } from '../venues/venues.service';
import { IndexBerlinService } from '../index-berlin/index-berlin.service';
import { KulturdatenService } from '../kulturdaten-berlin/kulturdaten.service';

interface EventGroupData {
  id: string;
  name: string;
  events: Event[];
}

@Injectable()
export class EventGroupsService {
  private readonly groups: EventGroupData[] = [
    {
      id: 'berlin-music-day',
      name: 'Berlin Music Day',
      events: [
        // ── April 5 ──
        {
          id: 'evt-001',
          name: 'Berlin Electronic Showcase',
          presenter: 'DJ Stellar',
          description: 'Underground electronic music showcase featuring Berlin\'s finest DJs.',
          venueId: 'ven-001',
          startTime: '2026-04-05T14:00:00+02:00',
          endTime: '2026-04-05T18:00:00+02:00',
        },
        {
          id: 'evt-002',
          name: 'Indie Rock Night',
          presenter: 'The Wanderers',
          description: 'An evening of raw indie rock with bands from across Europe.',
          venueId: 'ven-002',
          startTime: '2026-04-05T19:00:00+02:00',
          endTime: '2026-04-05T23:00:00+02:00',
        },
        {
          id: 'evt-005',
          name: 'Jazz & Soul Brunch',
          presenter: 'Mira Santos Quartet',
          description: 'Smooth jazz and soul to start your weekend right.',
          venueId: 'ven-005',
          startTime: '2026-04-05T10:00:00+02:00',
          endTime: '2026-04-05T13:00:00+02:00',
        },
        {
          id: 'evt-008',
          name: 'Classical Piano Recital',
          presenter: 'Yuki Tanaka',
          description: 'Chopin and Liszt performed on a restored Steinway grand.',
          venueId: 'ven-008',
          startTime: '2026-04-05T18:00:00+02:00',
          endTime: '2026-04-05T20:00:00+02:00',
        },
        {
          id: 'evt-009',
          name: 'Techno Sunrise Set',
          presenter: 'Kommando Nacht',
          description: 'Early morning techno for the dedicated. Coffee provided.',
          venueId: 'ven-001',
          startTime: '2026-04-05T06:00:00+02:00',
          endTime: '2026-04-05T10:00:00+02:00',
        },
        {
          id: 'evt-010',
          name: 'Acoustic Singer-Songwriter Night',
          presenter: 'Lena Braun',
          description: 'Intimate acoustic performances in a candlelit setting.',
          venueId: 'ven-005',
          startTime: '2026-04-05T20:00:00+02:00',
          endTime: '2026-04-05T23:00:00+02:00',
        },
        // ── April 10 ──
        {
          id: 'evt-013',
          name: 'Afrobeat Collective Live',
          presenter: 'Sahara Groove',
          description: 'High-energy Afrobeat with a 10-piece band straight from Lagos via Berlin.',
          venueId: 'ven-007',
          startTime: '2026-04-10T19:00:00+02:00',
          endTime: '2026-04-10T23:00:00+02:00',
        },
        {
          id: 'evt-014',
          name: 'Vinyl Listening Session',
          presenter: 'Schallplatten Klub',
          description: 'Curated deep cuts on a world-class hi-fi system. Bring your own records.',
          venueId: 'ven-004',
          startTime: '2026-04-10T15:00:00+02:00',
          endTime: '2026-04-10T18:00:00+02:00',
        },
        {
          id: 'evt-015',
          name: 'Electronic Ambient Night',
          presenter: 'Klangwolke',
          description: 'Immersive ambient electronics with spatial audio in a darkened hall.',
          venueId: 'ven-006',
          startTime: '2026-04-10T21:00:00+02:00',
          endTime: '2026-04-11T01:00:00+02:00',
        },
      ],
    },
    {
      id: 'berlin-arts-culture',
      name: 'Berlin Arts & Culture',
      events: [
        // ── April 5 ──
        {
          id: 'evt-003',
          name: 'Contemporary Dance Festival',
          presenter: 'Berlin Movement Collective',
          description: 'Three hours of boundary-pushing contemporary dance.',
          venueId: 'ven-003',
          startTime: '2026-04-05T11:00:00+02:00',
          endTime: '2026-04-05T14:00:00+02:00',
        },
        {
          id: 'evt-004',
          name: 'Poetry Slam Championship',
          presenter: 'Kreuzberg Poets Guild',
          description: 'The annual Berlin poetry slam with 16 poets competing.',
          venueId: 'ven-004',
          startTime: '2026-04-05T16:00:00+02:00',
          endTime: '2026-04-05T19:00:00+02:00',
        },
        {
          id: 'evt-006',
          name: 'Experimental Theatre: "Echoes"',
          presenter: 'Volksbühne Ensemble',
          description: 'A provocative new piece exploring memory and identity.',
          venueId: 'ven-006',
          startTime: '2026-04-05T20:00:00+02:00',
          endTime: '2026-04-05T22:30:00+02:00',
        },
        {
          id: 'evt-007',
          name: 'Hip-Hop Block Party',
          presenter: 'MC Blaze & Friends',
          description: 'Outdoor hip-hop event with MCs, breakdancers, and graffiti artists.',
          venueId: 'ven-007',
          startTime: '2026-04-05T15:00:00+02:00',
          endTime: '2026-04-05T20:00:00+02:00',
        },
        {
          id: 'evt-011',
          name: 'Gallery Opening: "Neon Dreams"',
          presenter: 'Galerie König',
          description: 'Opening night of a neon-infused multimedia art exhibition.',
          venueId: 'ven-003',
          startTime: '2026-04-05T18:00:00+02:00',
          endTime: '2026-04-05T21:00:00+02:00',
        },
        {
          id: 'evt-012',
          name: 'Independent Film Screening',
          presenter: 'Berlin Film Collective',
          description: 'Short films from emerging Berlin-based filmmakers.',
          venueId: 'ven-008',
          startTime: '2026-04-05T14:00:00+02:00',
          endTime: '2026-04-05T16:30:00+02:00',
        },
        // ── April 10 ──
        {
          id: 'evt-016',
          name: 'Street Art Walking Tour',
          presenter: 'Urban Canvas Berlin',
          description: 'Guided walk through Kreuzberg\'s ever-changing murals and paste-ups.',
          venueId: 'ven-004',
          startTime: '2026-04-10T11:00:00+02:00',
          endTime: '2026-04-10T13:30:00+02:00',
        },
        {
          id: 'evt-017',
          name: 'Improv Comedy Showdown',
          presenter: 'Die Schnelldenker',
          description: 'Unscripted chaos — audience suggestions drive every scene.',
          venueId: 'ven-002',
          startTime: '2026-04-10T20:00:00+02:00',
          endTime: '2026-04-10T22:00:00+02:00',
        },
      ],
    },
  ];

  constructor(
    private readonly venuesService: VenuesService,
    @Optional() private readonly indexBerlin?: IndexBerlinService,
    @Optional() private readonly kulturdaten?: KulturdatenService,
  ) {}

  private resolveVenues(events: Event[]): EventWithVenue[] {
    return events
      .map((event) => {
        const venue = this.venuesService.findById(event.venueId);
        if (!venue) return null;
        return { ...event, venue } as EventWithVenue;
      })
      .filter(Boolean) as EventWithVenue[];
  }

  /**
   * Extract the local date (YYYY-MM-DD) from an ISO 8601 string,
   * respecting the embedded timezone offset.
   */
  private localDate(iso: string): string {
    // Match offset like +02:00 or -05:00
    const offsetMatch = iso.match(/([+-])(\d{2}):(\d{2})$/);
    if (!offsetMatch) {
      // No offset — treat as UTC and take the date portion
      return iso.slice(0, 10);
    }
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const offsetMinutes = sign * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3]));
    const utc = new Date(iso).getTime();
    const local = new Date(utc + offsetMinutes * 60000);
    const y = local.getUTCFullYear();
    const m = String(local.getUTCMonth() + 1).padStart(2, '0');
    const d = String(local.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private computeSummary(group: EventGroupData): EventGroupSummary {
    const starts = group.events.map((e) => e.startTime);
    const ends = group.events.map((e) => e.endTime);
    starts.sort();
    ends.sort();

    return {
      id: group.id,
      name: group.name,
      eventCount: group.events.length,
      earliestStart: starts[0],
      latestEnd: ends[ends.length - 1],
    };
  }

  async findAll(): Promise<EventGroupSummary[]> {
    const staticGroups = this.groups.map((g) => this.computeSummary(g));
    const dynamicSummaries: EventGroupSummary[] = [];

    if (this.indexBerlin) {
      try {
        dynamicSummaries.push(await this.indexBerlin.getSummary());
      } catch {
        // If Index Berlin scraping fails, skip it
      }
    }

    if (this.kulturdaten) {
      try {
        dynamicSummaries.push(await this.kulturdaten.getSummary());
      } catch {
        // If Kulturdaten fetch fails, skip it
      }
    }

    return [...staticGroups, ...dynamicSummaries];
  }

  async findById(id: string): Promise<EventGroup | undefined> {
    if (this.indexBerlin && id === this.indexBerlin.groupId) {
      return this.indexBerlin.getEventGroup();
    }
    if (this.kulturdaten && id === this.kulturdaten.groupId) {
      return this.kulturdaten.getEventGroup();
    }
    const group = this.groups.find((g) => g.id === id);
    if (!group) return undefined;
    return {
      id: group.id,
      name: group.name,
      events: this.resolveVenues(group.events),
    };
  }

  async findByIdAtDate(id: string, date: string): Promise<EventGroup | undefined> {
    if (this.indexBerlin && id === this.indexBerlin.groupId) {
      const full = await this.indexBerlin.getEventGroup();
      return {
        ...full,
        events: full.events.filter((e) => this.localDate(e.startTime) === date),
      };
    }
    if (this.kulturdaten && id === this.kulturdaten.groupId) {
      // Kulturdaten fetches per-date natively, so pass the date through
      return this.kulturdaten.getEventGroup(date);
    }
    const group = this.groups.find((g) => g.id === id);
    if (!group) return undefined;
    const filtered = group.events.filter((e) => this.localDate(e.startTime) === date);
    return {
      id: group.id,
      name: group.name,
      events: this.resolveVenues(filtered),
    };
  }

  getAllEvents(): EventWithVenue[] {
    const allRaw = this.groups.flatMap((g) => g.events);
    return this.resolveVenues(allRaw);
  }
}