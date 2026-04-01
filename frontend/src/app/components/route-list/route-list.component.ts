import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpreePlan } from '../../models';
import { DurationPipe } from '../../pipes/duration.pipe';
import { DistancePipe } from '../../pipes/distance.pipe';

@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [CommonModule, DurationPipe, DistancePipe],
  template: `
    <div class="route-list">
      <h3 class="route-title">🗺️ Route Plan</h3>

      <!-- Optimization stats bar -->
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">{{ plan.stats.eventsScheduled }}</span>
          <span class="stat-label">Events</span>
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
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value">{{ plan.stats.totalIdleMinutes }}m</span>
          <span class="stat-label">Waiting</span>
        </div>
      </div>

      <!-- Strategy badge -->
      <div class="strategy-badge">
        <span class="strategy-icon">{{ plan.stats.strategy === 'greedy-nearest-time' ? '🧠' : '🕐' }}</span>
        {{ plan.stats.strategy === 'greedy-nearest-time' ? 'Smart route (minimized travel + wait)' : 'Ordered by event start time' }}
      </div>

      <!-- Legs timeline -->
      <div class="timeline">
        <!-- Start node -->
        <div class="timeline-node start-node">
          <div class="node-dot home-dot">🏠</div>
          <div class="node-content">
            <span class="node-label">Depart Home</span>
            <span class="node-time">{{ formatTime(plan.startTime) }}</span>
          </div>
        </div>

        @for (leg of plan.legs; track leg.order) {
          <!-- Travel segment -->
          <div class="timeline-travel">
            <div class="travel-line" [class.exceeds]="leg.exceedsWindow"></div>
            <div class="travel-card">
              <span class="travel-icon">{{ getTravelIcon(leg.travelFromPrevious.travelMode) }}</span>
              <div class="travel-info">
                <span class="travel-duration">{{ leg.travelFromPrevious.durationSeconds | duration }}</span>
                <span class="travel-distance">{{ leg.travelFromPrevious.distanceMeters | distance }}</span>
              </div>
            </div>
          </div>

          <!-- Idle wait indicator -->
          @if (leg.idleWaitMinutes > 0) {
            <div class="idle-indicator">
              <div class="idle-line"></div>
              <div class="idle-card">
                <span class="idle-icon">⏳</span>
                <span class="idle-text">{{ leg.idleWaitMinutes }} min wait for event to start</span>
              </div>
            </div>
          }

          <!-- Event stop node -->
          <div class="timeline-node event-node" [class.exceeds]="leg.exceedsWindow">
            <div class="node-dot event-dot">
              <span>{{ leg.order }}</span>
            </div>
            <div class="node-content">
              <span class="node-label">{{ leg.event.name }}</span>
              <span class="node-venue">{{ leg.event.venue.name }} · {{ leg.event.presenter }}</span>
              <div class="node-times">
                <span class="badge arrive">{{ formatTime(leg.arrivalTime) }}</span>
                <span class="badge stay">{{ leg.stayMinutes }} min</span>
                <span class="badge depart">→ {{ formatTime(leg.departureTime) }}</span>
              </div>
              @if (leg.exceedsWindow) {
                <div class="leg-warning">
                  ⚠️ Past your spree end time
                </div>
              }
            </div>
          </div>
        }

        <!-- End node -->
        <div class="timeline-node end-node">
          <div class="node-dot end-dot">🏁</div>
          <div class="node-content">
            <span class="node-label">Spree Complete</span>
            <span class="node-time">{{ plan.totalDurationMinutes }} min total</span>
          </div>
        </div>
      </div>

      <!-- Skipped events -->
      @if (plan.skippedEvents.length > 0) {
        <div class="skipped-section">
          <h4 class="skipped-title">🚫 Unreachable Events</h4>
          @for (skip of plan.skippedEvents; track skip.event.id) {
            <div class="skipped-card">
              <div class="skipped-info">
                <span class="skipped-name">{{ skip.event.name }}</span>
                <span class="skipped-venue">{{ skip.event.venue.name }}</span>
              </div>
              <span class="skipped-reason">{{ skip.reason }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .route-list {
      margin-top: 16px;
      border-top: 1px solid var(--border);
      padding-top: 16px;
      animation: fadeSlideUp 0.4s ease;
    }
    .route-title {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-display);
    }

    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Stats bar ── */
    .stats-bar {
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 12px 8px;
      background: var(--surface-dim);
      border-radius: 12px;
      margin-bottom: 10px;
    }
    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .stat-value {
      font-size: 16px;
      font-weight: 700;
      color: var(--accent);
    }
    .stat-label {
      font-size: 11px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .stat-divider {
      width: 1px;
      height: 28px;
      background: var(--border);
    }

    /* ── Strategy badge ── */
    .strategy-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--accent-faint);
      border-radius: 8px;
      font-size: 12px;
      color: var(--accent);
      font-weight: 500;
      margin-bottom: 16px;
    }
    .strategy-icon { font-size: 14px; }

    /* ── Timeline ── */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* ── Timeline nodes (start, event, end) ── */
    .timeline-node {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 0;
    }
    .node-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .home-dot {
      background: var(--accent-faint);
      border: 2px solid var(--accent);
    }
    .event-dot {
      background: var(--accent);
      color: white;
      font-weight: 700;
      font-size: 13px;
    }
    .end-dot {
      background: var(--surface-dim);
      border: 2px solid var(--border);
    }
    .node-content {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      flex: 1;
    }
    .node-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .node-venue {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .node-time {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .node-times {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .badge {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 100px;
    }
    .badge.arrive { background: #dbeafe; color: #1d4ed8; }
    .badge.stay { background: #d1fae5; color: #047857; }
    .badge.depart { background: #fef3c7; color: #b45309; }

    .leg-warning {
      margin-top: 4px;
      font-size: 11px;
      color: #dc2626;
      font-weight: 500;
    }

    .timeline-node.exceeds .event-dot {
      background: #f59e0b;
    }

    /* ── Travel segment ── */
    .timeline-travel {
      display: flex;
      align-items: stretch;
      gap: 12px;
      padding-left: 15px; /* center with dot */
    }
    .travel-line {
      width: 2px;
      background: var(--border);
      min-height: 32px;
      flex-shrink: 0;
    }
    .travel-line.exceeds {
      background: #fde68a;
    }
    .travel-card {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      margin-left: 8px;
    }
    .travel-icon { font-size: 16px; }
    .travel-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .travel-duration {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .travel-distance {
      font-size: 11px;
      color: var(--text-secondary);
    }

    /* ── Idle wait ── */
    .idle-indicator {
      display: flex;
      align-items: stretch;
      gap: 12px;
      padding-left: 15px;
    }
    .idle-line {
      width: 2px;
      background: repeating-linear-gradient(
        to bottom,
        var(--border) 0px,
        var(--border) 4px,
        transparent 4px,
        transparent 8px
      );
      min-height: 28px;
      flex-shrink: 0;
    }
    .idle-card {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      margin-left: 8px;
      background: #fffbeb;
      border-radius: 8px;
      border: 1px solid #fde68a;
    }
    .idle-icon { font-size: 13px; }
    .idle-text {
      font-size: 12px;
      color: #92400e;
      font-weight: 500;
    }

    /* ── Skipped events ── */
    .skipped-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .skipped-title {
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .skipped-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      margin-bottom: 8px;
    }
    .skipped-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .skipped-name {
      font-size: 13px;
      font-weight: 600;
      color: #991b1b;
    }
    .skipped-venue {
      font-size: 11px;
      color: #b91c1c;
    }
    .skipped-reason {
      font-size: 11px;
      color: #dc2626;
      font-weight: 500;
      text-align: right;
      max-width: 120px;
    }
  `],
})
export class RouteListComponent {
  @Input({ required: true }) plan!: SpreePlan;

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getTravelIcon(mode: string): string {
    const icons: Record<string, string> = {
      DRIVE: '🚗',
      WALK: '🚶',
      BICYCLE: '🚲',
      TRANSIT: '🚇',
    };
    return icons[mode] || '🚗';
  }
}
