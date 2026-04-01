import { Injectable } from '@nestjs/common';
import { Event, EventWithVenue } from '../common/interfaces';
import { VenuesService } from '../venues/venues.service';

@Injectable()
export class EventsService {
  private readonly events: Event[] = [
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
      id: 'evt-005',
      name: 'Jazz & Soul Brunch',
      presenter: 'Mira Santos Quartet',
      description: 'Smooth jazz and soul to start your weekend right.',
      venueId: 'ven-005',
      startTime: '2026-04-05T10:00:00+02:00',
      endTime: '2026-04-05T13:00:00+02:00',
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
  ];

  constructor(private readonly venuesService: VenuesService) {}

  findAll(): Event[] {
    return this.events;
  }

  findById(id: string): Event | undefined {
    return this.events.find((e) => e.id === id);
  }

  findAllWithVenues(): EventWithVenue[] {
    return this.events
      .map((event) => {
        const venue = this.venuesService.findById(event.venueId);
        if (!venue) return null;
        return { ...event, venue } as EventWithVenue;
      })
      .filter(Boolean) as EventWithVenue[];
  }

  findByIdWithVenue(id: string): EventWithVenue | undefined {
    const event = this.findById(id);
    if (!event) return undefined;
    const venue = this.venuesService.findById(event.venueId);
    if (!venue) return undefined;
    return { ...event, venue };
  }

  /**
   * Returns events whose time window overlaps with [start, end].
   */
  findInTimeRange(startTime: string, endTime: string): EventWithVenue[] {
    const rangeStart = new Date(startTime).getTime();
    const rangeEnd = new Date(endTime).getTime();

    return this.findAllWithVenues().filter((ev) => {
      const evStart = new Date(ev.startTime).getTime();
      const evEnd = new Date(ev.endTime).getTime();
      return evStart < rangeEnd && evEnd > rangeStart;
    });
  }

  /**
   * Create a new event (organizer/admin only).
   */
  create(
    data: { name: string; presenter: string; description: string; venueId: string; startTime: string; endTime: string },
    createdBy: { id: string; username: string },
  ): EventWithVenue {
    const id = `evt-${String(this.events.length + 1).padStart(3, '0')}`;
    const event: Event = { id, ...data };
    this.events.push(event);

    const venue = this.venuesService.findById(data.venueId);
    return { ...event, venue: venue! } as EventWithVenue;
  }

  /**
   * Remove an event by ID.
   */
  remove(id: string): { deleted: boolean } {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx === -1) return { deleted: false };
    this.events.splice(idx, 1);
    return { deleted: true };
  }
}
