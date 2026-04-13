import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveSpreeStateService } from '../../../services';
import { LiveLegStatus } from '../../../models';
import { DurationPipe } from '../../../pipes/duration.pipe';
import { DistancePipe } from '../../../pipes/distance.pipe';

@Component({
  selector: 'app-live-route-list',
  standalone: true,
  imports: [CommonModule, DurationPipe, DistancePipe],
  template: `
    @if (liveState.currentPlan(); as plan) {
      <div class="route-list">
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-value">{{ liveState.visitedCount() }}/{{ liveState.totalCount() }}</span>
            <span class="stat-label">Visited</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-value">{{ plan.stats.totalTravelMinutes }}m</span>
            <span class="stat-label">Travel</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-value">{{ plan.stats.totalStayMinutes }}m</span>
            <span class="stat-label">At Events</span>
          </div>
        </div>

        <div class="timeline">
          @for (leg of plan.legs; track leg.order) {
            <div class="leg" [class]="getLegClass(leg.event.id)">
              <!-- Travel -->
              @if (getStatus(leg.event.id) !== 'visited') {
                <div class="travel-row">
                  <div class="travel-line"></div>
                  <div class="travel-card">
                    <span>{{ getTravelIcon(leg.travelFromPrevious.travelMode) }}</span>
                    <span class="travel-dur">{{ leg.travelFromPrevious.durationSeconds | duration }}</span>
                    <span class="travel-dist">{{ leg.travelFromPrevious.distanceMeters | distance }}</span>
                  </div>
                </div>
              }

              <!-- Event node -->
              <div class="event-row">
                <div class="event-dot">
                  @if (getStatus(leg.event.id) === 'visited') {
                    ✓
                  } @else if (getStatus(leg.event.id) === 'excluded') {
                    —
                  } @else {
                    {{ leg.order }}
                  }
                </div>
                <div class="event-info">
                  <span class="event-name">{{ leg.event.name }}</span>
                  <span class="event-venue">{{ leg.event.venue.name }}</span>
                  @if (leg.colocatedEvents?.length) {
                    @for (co of leg.colocatedEvents; track co.id) {
                      <span class="event-colocated">+ {{ co.name }}</span>
                    }
                  }
                  <div class="event-meta">
                    <span class="badge">{{ formatTime(leg.arrivalTime) }}</span>
                    <span class="badge stay">{{ leg.stayMinutes }}m</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .route-list { padding: 16px; }
    .stats-bar {
      display: flex; align-items: center; justify-content: space-around;
      padding: 10px; background: var(--surface-dim); border-radius: 12px; margin-bottom: 12px;
    }
    .stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .stat-value { font-size: 16px; font-weight: 700; color: var(--accent); }
    .stat-label { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
    .stat-divider { width: 1px; height: 24px; background: var(--border); }

    .timeline { display: flex; flex-direction: column; }
    .leg { animation: fadeIn 0.2s ease; }
    .leg.visited { opacity: 0.4; }
    .leg.excluded { opacity: 0.3; text-decoration: line-through; }
    .leg.next { background: var(--accent-faint, #eef2ff); border-radius: 12px; padding: 4px 8px; margin: -4px -8px; }

    .travel-row { display: flex; align-items: stretch; gap: 12px; padding-left: 15px; }
    .travel-line { width: 2px; background: var(--border); min-height: 24px; }
    .travel-card {
      display: flex; align-items: center; gap: 6px; padding: 4px 8px; margin-left: 8px;
      font-size: 12px; color: var(--text-secondary);
    }
    .travel-dur { font-weight: 600; color: var(--text-primary); }
    .travel-dist { font-size: 11px; }

    .event-row { display: flex; align-items: flex-start; gap: 12px; padding: 6px 0; }
    .event-dot {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: white; background: var(--accent);
    }
    .leg.visited .event-dot { background: #94a3b8; }
    .leg.excluded .event-dot { background: #cbd5e1; }
    .leg.next .event-dot { background: #4f46e5; box-shadow: 0 0 0 4px rgba(79,70,229,0.2); }
    .leg.checked-in .event-dot { background: #10b981; }

    .event-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .event-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .event-venue { font-size: 12px; color: var(--text-secondary); }
    .event-colocated { font-size: 11px; color: var(--accent); font-weight: 500; }
    .event-meta { display: flex; gap: 6px; margin-top: 4px; }
    .badge {
      font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 100px;
      background: #dbeafe; color: #1d4ed8;
    }
    .badge.stay { background: #d1fae5; color: #047857; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `],
})
export class LiveRouteListComponent {
  readonly liveState = inject(LiveSpreeStateService);

  getStatus(eventId: string): LiveLegStatus {
    return this.liveState.getEventStatus(eventId);
  }

  getLegClass(eventId: string): string {
    return this.getStatus(eventId);
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  getTravelIcon(mode: string): string {
    return { DRIVE: '🚗', WALK: '🚶', BICYCLE: '🚲', TRANSIT: '🚇' }[mode] || '🚗';
  }
}
