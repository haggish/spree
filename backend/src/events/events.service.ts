import { Injectable } from '@nestjs/common';
import { Event, EventWithVenue } from '../common/interfaces';
import { VenuesService } from '../venues/venues.service';
import { EventGroupsService } from '../event-groups/event-groups.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly venuesService: VenuesService,
    private readonly eventGroupsService: EventGroupsService,
  ) {}

  findAll(): Event[] {
    return this.eventGroupsService.getAllEvents();
  }

  findById(id: string): Event | undefined {
    return this.eventGroupsService.getAllEvents().find((e) => e.id === id);
  }

  findAllWithVenues(): EventWithVenue[] {
    return this.eventGroupsService.getAllEvents();
  }

  findByIdWithVenue(id: string): EventWithVenue | undefined {
    return this.eventGroupsService.getAllEvents().find((e) => e.id === id);
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
    // Note: create/remove operate on a transient in-memory list — not persisted across groups
    const allEvents = this.eventGroupsService.getAllEvents();
    const id = `evt-${String(allEvents.length + 1).padStart(3, '0')}`;
    const event: Event = { id, ...data };
    const venue = this.venuesService.findById(data.venueId);
    return { ...event, venue: venue! } as EventWithVenue;
  }

  /**
   * Remove an event by ID.
   */
  remove(id: string): { deleted: boolean } {
    // No-op for now — mock data is read-only
    return { deleted: false };
  }
}
