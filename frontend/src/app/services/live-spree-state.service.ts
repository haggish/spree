import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SpreePlan, SpreeLeg, LiveLegStatus, EventWithVenue } from '../models';
import { SpreeApiService } from './spree-api.service';
import { SavedSpreesApiService, SavedSpree } from './saved-sprees-api.service';
import { GeolocationService } from './geolocation.service';

@Injectable({ providedIn: 'root' })
export class LiveSpreeStateService {
  private readonly spreeApi = inject(SpreeApiService);
  private readonly savedApi = inject(SavedSpreesApiService);
  private readonly geo = inject(GeolocationService);

  // Core state
  readonly savedSpree = signal<SavedSpree | null>(null);
  readonly currentPlan = signal<SpreePlan | null>(null);
  readonly eventStates = signal<Map<string, LiveLegStatus>>(new Map());
  readonly checkedInEventId = signal<string | null>(null);
  readonly computing = signal(false);
  readonly error = signal<string | null>(null);
  readonly active = signal(false);

  // Derived
  readonly allLegs = computed(() => this.currentPlan()?.legs ?? []);

  readonly nextLeg = computed(() => {
    const states = this.eventStates();
    return this.allLegs().find((leg) => {
      const status = states.get(leg.event.id);
      return status === 'next';
    }) ?? null;
  });

  readonly remainingLegs = computed(() => {
    const states = this.eventStates();
    return this.allLegs().filter((leg) => {
      const status = states.get(leg.event.id);
      return status === 'upcoming' || status === 'next';
    });
  });

  readonly visitedCount = computed(() => {
    let count = 0;
    for (const status of this.eventStates().values()) {
      if (status === 'visited') count++;
    }
    return count;
  });

  readonly totalCount = computed(() => {
    return this.eventStates().size;
  });

  /** Get the status for a specific event */
  getEventStatus(eventId: string): LiveLegStatus {
    return this.eventStates().get(eventId) ?? 'upcoming';
  }

  /** Load a saved spree by ID */
  async loadSpree(id: string): Promise<void> {
    try {
      const spree = await firstValueFrom(this.savedApi.getById(id));
      this.savedSpree.set(spree);
      this.currentPlan.set(spree.plan);
      this.initEventStates(spree.plan);
    } catch (err) {
      this.error.set('Failed to load saved spree');
    }
  }

  /** Start live mode: recompute from current GPS location */
  async startLive(): Promise<void> {
    this.active.set(true);
    await this.recompute();
  }

  /** Check in at a venue */
  checkIn(eventId: string): void {
    this.checkedInEventId.set(eventId);
    this.updateEventState(eventId, 'checked-in');
  }

  /** Check out from current venue and recompute */
  async checkOut(): Promise<void> {
    const eventId = this.checkedInEventId();
    if (eventId) {
      this.updateEventState(eventId, 'visited');
      this.checkedInEventId.set(null);
      await this.recompute();
    }
  }

  /** Exclude an event from the spree and recompute */
  async exclude(eventId: string): Promise<void> {
    this.updateEventState(eventId, 'excluded');
    await this.recompute();
  }

  /** Include a previously excluded event back and recompute */
  async include(eventId: string): Promise<void> {
    this.updateEventState(eventId, 'upcoming');
    await this.recompute();
  }

  /** Force a specific event as the next destination and recompute */
  async forceNext(eventId: string): Promise<void> {
    await this.recompute(eventId);
  }

  /** Reset all live state */
  reset(): void {
    this.savedSpree.set(null);
    this.currentPlan.set(null);
    this.eventStates.set(new Map());
    this.checkedInEventId.set(null);
    this.computing.set(false);
    this.error.set(null);
    this.active.set(false);
  }

  /** Recompute the route from current location with remaining events */
  private async recompute(forcedFirstEventId?: string): Promise<void> {
    const plan = this.currentPlan();
    const pos = this.geo.currentPosition();
    if (!plan) return;

    // Use GPS position if available, otherwise fall back to plan's home
    const homeLocation = pos ?? plan.homeLocation;

    // Collect remaining (non-visited, non-excluded) events
    const states = this.eventStates();
    const remainingEvents: { eventId: string; stayMinutes: number }[] = [];

    for (const leg of plan.legs) {
      const status = states.get(leg.event.id);
      if (status === 'visited' || status === 'excluded') continue;
      remainingEvents.push({ eventId: leg.event.id, stayMinutes: leg.stayMinutes });

      // Also include colocated events
      if (leg.colocatedEvents) {
        for (const co of leg.colocatedEvents) {
          const coStatus = states.get(co.id);
          if (coStatus === 'visited' || coStatus === 'excluded') continue;
          remainingEvents.push({ eventId: co.id, stayMinutes: leg.stayMinutes });
        }
      }
    }

    if (remainingEvents.length === 0) {
      // All done!
      return;
    }

    // If forcing a specific event first, put it at the front
    if (forcedFirstEventId) {
      const idx = remainingEvents.findIndex((e) => e.eventId === forcedFirstEventId);
      if (idx > 0) {
        const [forced] = remainingEvents.splice(idx, 1);
        remainingEvents.unshift(forced);
      }
    }

    this.computing.set(true);
    this.error.set(null);

    try {
      const newPlan = await firstValueFrom(
        this.spreeApi.computeSpree({
          homeLocation,
          startTime: new Date().toISOString(),
          endTime: plan.endTime,
          selections: remainingEvents,
          strategy: forcedFirstEventId ? 'time-sort' : 'greedy',
        }),
      );

      this.currentPlan.set(newPlan);
      this.rebuildEventStates(newPlan);
    } catch {
      this.error.set('Failed to recompute route');
    } finally {
      this.computing.set(false);
    }
  }

  /** Initialize event states from a fresh plan */
  private initEventStates(plan: SpreePlan): void {
    const states = new Map<string, LiveLegStatus>();
    plan.legs.forEach((leg, i) => {
      states.set(leg.event.id, i === 0 ? 'next' : 'upcoming');
      if (leg.colocatedEvents) {
        for (const co of leg.colocatedEvents) {
          states.set(co.id, i === 0 ? 'next' : 'upcoming');
        }
      }
    });
    this.eventStates.set(states);
  }

  /** Rebuild event states after recomputation, preserving visited/excluded */
  private rebuildEventStates(newPlan: SpreePlan): void {
    const oldStates = this.eventStates();
    const states = new Map<string, LiveLegStatus>();

    // Carry over visited and excluded
    for (const [eventId, status] of oldStates) {
      if (status === 'visited' || status === 'excluded') {
        states.set(eventId, status);
      }
    }

    // Mark new plan legs
    let firstRemaining = true;
    for (const leg of newPlan.legs) {
      if (!states.has(leg.event.id)) {
        states.set(leg.event.id, firstRemaining ? 'next' : 'upcoming');
        firstRemaining = false;
      }
      if (leg.colocatedEvents) {
        for (const co of leg.colocatedEvents) {
          if (!states.has(co.id)) {
            states.set(co.id, 'upcoming');
          }
        }
      }
    }

    this.eventStates.set(states);
  }

  /** Update a single event's state */
  private updateEventState(eventId: string, status: LiveLegStatus): void {
    const states = new Map(this.eventStates());
    states.set(eventId, status);

    // If we just visited/excluded the "next" event, promote the next remaining
    if ((status === 'visited' || status === 'excluded') && this.allLegs().length > 0) {
      let foundNext = false;
      for (const leg of this.allLegs()) {
        const s = states.get(leg.event.id);
        if (!foundNext && (s === 'upcoming' || s === undefined)) {
          states.set(leg.event.id, 'next');
          foundNext = true;
        }
      }
    }

    this.eventStates.set(states);
  }
}
