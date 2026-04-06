import { Injectable } from '@nestjs/common';
import { Event, EventWithVenue, EventGroupSummary, EventGroup } from '../common/interfaces';
import { VenuesService } from '../venues/venues.service';

interface EventGroupData {
  id: string;
  name: string;
  events: Event[];
}

@Injectable()
export class EventGroupsService {
  private readonly groups: EventGroupData[] = [
    {
      id: 'berlin-music-day-05-04-26',
      name: 'Berlin Music Day',
      events: [
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
      ],
    },
    {
      id: 'berlin-arts-culture-05-04-26',
      name: 'Berlin Arts & Culture',
      events: [
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
      ],
    },
  ];

  constructor(private readonly venuesService: VenuesService) {}

  private resolveVenues(events: Event[]): EventWithVenue[] {
    return events
      .map((event) => {
        const venue = this.venuesService.findById(event.venueId);
        if (!venue) return null;
        return { ...event, venue } as EventWithVenue;
      })
      .filter(Boolean) as EventWithVenue[];
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

  findAll(): EventGroupSummary[] {
    return this.groups.map((g) => this.computeSummary(g));
  }

  findById(id: string): EventGroup | undefined {
    const group = this.groups.find((g) => g.id === id);
    if (!group) return undefined;
    return {
      id: group.id,
      name: group.name,
      events: this.resolveVenues(group.events),
    };
  }

  getAllEvents(): EventWithVenue[] {
    const allRaw = this.groups.flatMap((g) => g.events);
    return this.resolveVenues(allRaw);
  }
}
