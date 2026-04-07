import { Injectable, inject, signal, computed } from '@angular/core';
import {
  EventWithVenue,
  EventGroupSummary,
  EventGroup,
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
    homeLocation: { lat: 52.4864597, lng: 13.3524421 }, // Berlin Mitte default
    homeLabel: 'Home',
    startTime: '2026-04-05T10:00:00+02:00',
    endTime: '2026-04-05T22:00:00+02:00',
    strategy: 'greedy',
  });

  // ── Event groups ──
  readonly eventGroups = signal<EventGroupSummary[]>([]);
  readonly selectedGroupId = signal<string | null>(null);
  readonly selectedDate = signal<string>(new Date().toISOString().slice(0, 10));

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

  setEventGroups(groups: EventGroupSummary[]): void {
    this.eventGroups.set(groups);
  }

  setEventsFromGroup(group: EventGroup): void {
    this.allEvents.set(group.events);
    this.selectedGroupId.set(group.id);
    this.clearSelections();

    if (group.events.length > 0) {
      const starts = group.events.map((e) => new Date(e.startTime).getTime());
      const ends = group.events.map((e) => new Date(e.endTime).getTime());
      const earliest = new Date(Math.min(...starts));
      const latest = new Date(Math.max(...ends));
      // Preserve the original timezone offset from the first event's startTime
      const offsetMatch = group.events[0].startTime.match(/[+-]\d{2}:\d{2}$/);
      const offset = offsetMatch ? offsetMatch[0] : '+02:00';
      const pad = (n: number) => String(n).padStart(2, '0');
      const toLocal = (d: Date) => {
        // Format as ISO with the group's timezone offset
        const tzOffsetMinutes = offset.startsWith('-')
          ? -(parseInt(offset.slice(1, 3)) * 60 + parseInt(offset.slice(4)))
          : parseInt(offset.slice(1, 3)) * 60 + parseInt(offset.slice(4));
        const utc = d.getTime();
        const local = new Date(utc + tzOffsetMinutes * 60000);
        return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}${offset}`;
      };
      this.updateConfig({ startTime: toLocal(earliest), endTime: toLocal(latest) });
    }
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
