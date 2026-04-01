import { Injectable, inject, signal, computed } from '@angular/core';
import {
  EventWithVenue,
  SpreeSelection,
  SpreeConfig,
  SpreePlan,
  LatLng,
} from '../models';
import { SpreeApiService } from './spree-api.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SpreeStateService {
  private readonly spreeApi = inject(SpreeApiService);

  // ── Config ──
  readonly config = signal<SpreeConfig>({
    homeLocation: { lat: 52.52, lng: 13.405 }, // Berlin Mitte default
    homeLabel: 'Home',
    startTime: '2026-04-05T10:00:00+02:00',
    endTime: '2026-04-05T22:00:00+02:00',
    travelMode: 'DRIVE',
    strategy: 'greedy',
  });

  // ── All events loaded from backend ──
  readonly allEvents = signal<EventWithVenue[]>([]);

  // ── Selections: eventId → stayMinutes ──
  readonly selections = signal<Map<string, number>>(new Map());

  // ── Computed spree plan from backend ──
  readonly spreePlan = signal<SpreePlan | null>(null);

  // ── Loading state ──
  readonly computing = signal(false);
  readonly error = signal<string | null>(null);

  // ── Derived: selected event IDs ──
  readonly selectedEventIds = computed(() =>
    new Set(this.selections().keys()),
  );

  // ── Derived: number of selections ──
  readonly selectionCount = computed(() => this.selections().size);

  // ── Derived: events filtered by spree time window ──
  readonly eventsInTimeRange = computed(() => {
    const cfg = this.config();
    const rangeStart = new Date(cfg.startTime).getTime();
    const rangeEnd = new Date(cfg.endTime).getTime();

    return this.allEvents().map((ev) => {
      const evStart = new Date(ev.startTime).getTime();
      const evEnd = new Date(ev.endTime).getTime();
      const inRange = evStart < rangeEnd && evEnd > rangeStart;
      return { ...ev, inRange };
    });
  });

  // ── Actions ──

  toggleEventSelection(eventId: string): void {
    const current = new Map(this.selections());
    if (current.has(eventId)) {
      current.delete(eventId);
    } else {
      current.set(eventId, 10); // default 10 min stay
    }
    this.selections.set(current);
    this.clearPlan();
  }

  setStayMinutes(eventId: string, minutes: number): void {
    const current = new Map(this.selections());
    if (current.has(eventId)) {
      current.set(eventId, minutes);
      this.selections.set(current);
      this.clearPlan();
    }
  }

  updateConfig(partial: Partial<SpreeConfig>): void {
    this.config.update((prev) => ({ ...prev, ...partial }));
    this.clearPlan();
  }

  setHomeLocation(location: LatLng, label?: string): void {
    this.config.update((prev) => ({
      ...prev,
      homeLocation: location,
      homeLabel: label || prev.homeLabel,
    }));
    this.clearPlan();
  }

  setEvents(events: EventWithVenue[]): void {
    this.allEvents.set(events);
  }

  clearPlan(): void {
    this.spreePlan.set(null);
    this.error.set(null);
  }

  clearSelections(): void {
    this.selections.set(new Map());
    this.clearPlan();
  }

  async computeSpree(): Promise<void> {
    const cfg = this.config();
    const sels = this.selections();

    if (sels.size === 0) return;

    const selections: SpreeSelection[] = [];
    sels.forEach((stayMinutes, eventId) => {
      selections.push({ eventId, stayMinutes });
    });

    this.computing.set(true);
    this.error.set(null);

    try {
      const plan = await firstValueFrom(
        this.spreeApi.computeSpree({
          homeLocation: cfg.homeLocation,
          startTime: cfg.startTime,
          endTime: cfg.endTime,
          selections,
          travelMode: cfg.travelMode,
          strategy: cfg.strategy,
        }),
      );
      this.spreePlan.set(plan);
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to compute spree route');
    } finally {
      this.computing.set(false);
    }
  }
}
