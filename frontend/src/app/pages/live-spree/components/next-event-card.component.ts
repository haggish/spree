import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveSpreeStateService, ProximityService } from '../../../services';
import { DurationPipe } from '../../../pipes/duration.pipe';
import { DistancePipe } from '../../../pipes/distance.pipe';

@Component({
  selector: 'app-next-event-card',
  standalone: true,
  imports: [CommonModule, DurationPipe, DistancePipe],
  template: `
    @if (liveState.nextLeg(); as leg) {
      <div class="card">
        <div class="card-header">
          <span class="card-label">NEXT</span>
          <span class="card-order">#{{ leg.order }}</span>
        </div>

        <h3 class="event-name">{{ leg.event.name }}</h3>
        <p class="event-venue">📍 {{ leg.event.venue.name }}</p>
        <p class="event-presenter">{{ leg.event.presenter }}</p>

        @if (leg.colocatedEvents?.length) {
          <div class="colocated">
            @for (co of leg.colocatedEvents; track co.id) {
              <span class="colocated-chip">{{ co.name }}</span>
            }
          </div>
        }

        <!-- Travel info -->
        <div class="travel-info">
          <span class="travel-icon">{{ getTravelIcon(leg.travelFromPrevious.travelMode) }}</span>
          <span class="travel-duration">{{ leg.travelFromPrevious.durationSeconds | duration }}</span>
          <span class="travel-distance">{{ leg.travelFromPrevious.distanceMeters | distance }}</span>
        </div>

        @if (leg.travelFromPrevious.transitDetails?.length) {
          <div class="transit-details">
            @for (td of leg.travelFromPrevious.transitDetails; track $index) {
              <div class="transit-step">
                <span class="transit-badge">{{ getTransitIcon(td.transitType) }} {{ td.lineName }}</span>
                <span class="transit-stops">{{ td.departureStop }} → {{ td.arrivalStop }}</span>
              </div>
            }
          </div>
        }

        @if (leg.idleWaitMinutes > 0) {
          <div class="idle-note">⏳ {{ leg.idleWaitMinutes }} min wait</div>
        }

        <!-- Action buttons -->
        <div class="actions">
          @if (liveState.checkedInEventId() === leg.event.id) {
            <button class="btn checkout-btn" (click)="liveState.checkOut()">
              Check Out
            </button>
          } @else {
            <button
              class="btn checkin-btn"
              [disabled]="!proximity.nearNextVenue()"
              (click)="liveState.checkIn(leg.event.id)">
              {{ proximity.nearNextVenue() ? 'Check In' : 'Check In (get closer)' }}
            </button>
          }
          <button class="btn exclude-btn" (click)="liveState.exclude(leg.event.id)">
            Exclude
          </button>
        </div>
      </div>
    } @else {
      <div class="done-card">
        <span class="done-icon">🎉</span>
        <h3 class="done-title">Spree Complete!</h3>
        <p class="done-text">{{ liveState.visitedCount() }} of {{ liveState.totalCount() }} events visited</p>
      </div>
    }
  `,
  styles: [`
    .card {
      padding: 16px;
      animation: fadeIn 0.3s ease;
    }
    .card-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
    }
    .card-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
      padding: 2px 10px; background: #4f46e5; color: white; border-radius: 100px;
    }
    .card-order { font-size: 12px; color: var(--text-secondary); }
    .event-name {
      margin: 0 0 4px; font-size: 18px; font-weight: 700; color: var(--text-primary);
    }
    .event-venue { margin: 0 0 2px; font-size: 13px; color: var(--accent); font-weight: 600; }
    .event-presenter { margin: 0 0 8px; font-size: 12px; color: var(--text-secondary); }
    .colocated { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
    .colocated-chip {
      font-size: 11px; padding: 2px 8px;
      background: var(--accent-faint, #eef2ff); color: var(--accent); border-radius: 100px;
      font-weight: 600;
    }
    .travel-info {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; background: var(--surface-dim); border-radius: 10px; margin-bottom: 8px;
    }
    .travel-icon { font-size: 18px; }
    .travel-duration { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .travel-distance { font-size: 12px; color: var(--text-secondary); }
    .transit-details { margin-bottom: 8px; }
    .transit-step { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 3px; }
    .transit-badge {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 8px; background: #dbeafe; color: #1d4ed8;
      border-radius: 100px; font-weight: 600; font-size: 11px;
    }
    .transit-stops { color: var(--text-secondary); font-size: 11px; }
    .idle-note {
      padding: 6px 10px; background: #fffbeb; border: 1px solid #fde68a;
      border-radius: 8px; font-size: 12px; color: #92400e; font-weight: 500; margin-bottom: 10px;
    }
    .actions { display: flex; gap: 8px; }
    .btn {
      flex: 1; padding: 12px; border: none; border-radius: 12px;
      font-size: 14px; font-weight: 700; cursor: pointer;
    }
    .checkin-btn { background: #10b981; color: white; }
    .checkin-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
    .checkout-btn { background: #f59e0b; color: white; }
    .exclude-btn { background: #f1f5f9; color: #64748b; flex: 0; padding: 12px 16px; }
    .btn:active:not(:disabled) { transform: scale(0.97); }
    .done-card {
      padding: 32px 16px; text-align: center;
    }
    .done-icon { font-size: 48px; display: block; margin-bottom: 8px; }
    .done-title { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
    .done-text { margin: 0; font-size: 14px; color: var(--text-secondary); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `],
})
export class NextEventCardComponent {
  readonly liveState = inject(LiveSpreeStateService);
  readonly proximity = inject(ProximityService);

  getTravelIcon(mode: string): string {
    return { DRIVE: '🚗', WALK: '🚶', BICYCLE: '🚲', TRANSIT: '🚇' }[mode] || '🚗';
  }

  getTransitIcon(type: string): string {
    return { BUS: '🚌', SUBWAY: '🚇', TRAM: '🚊', RAIL: '🚆' }[type] || '🚌';
  }
}
