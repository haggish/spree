import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpreeStateService, AuthService, SavedSpreesApiService } from '../../services';
import { RouteListComponent } from '../route-list/route-list.component';
import { TimeWarningComponent } from '../time-warning/time-warning.component';
@Component({
  selector: 'app-spree-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouteListComponent, TimeWarningComponent],
  template: `
    <div
      class="panel"
      [class.expanded]="expanded()"
      [class.has-plan]="!!state.spreePlan()"
      [class.pulse-success]="justComputed()"
    >
      <!-- Handle bar -->
      <button class="handle-bar" (click)="toggle()">
        <span class="handle-pill"></span>
      </button>

      <!-- Header -->
      <div class="panel-header" (click)="toggle()">
        <div class="header-left">
          <span class="spree-icon">{{ state.spreePlan() ? '🗺️' : '🎯' }}</span>
          <div>
            <h2 class="panel-title">
              {{ state.spreePlan() ? 'Your Route' : 'Your Spree' }}
            </h2>
            <span class="panel-subtitle">
              @if (state.spreePlan(); as plan) {
                {{ plan.legs.length }} stops · {{ plan.totalDurationMinutes }} min
                @if (plan.exceedsEndTime) {
                  <span class="subtitle-warn"> · ⚠️ over time</span>
                }
              } @else {
                {{ state.selectionCount() }} event{{ state.selectionCount() !== 1 ? 's' : '' }} selected
              }
            </span>
          </div>
        </div>
        <div class="header-right">
          @if (state.selectionCount() > 0 && !expanded()) {
            <span class="selection-badge">{{ state.selectionCount() }}</span>
          }
          <span class="expand-icon" [class.flipped]="expanded()">▾</span>
        </div>
      </div>

      <!-- Content -->
      @if (expanded()) {
        <div class="panel-content">

          <!-- Selected events list -->
          @if (state.selectionCount() > 0) {
            <div class="selections-list">
              @for (ev of getSelectedEvents(); track ev.id; let i = $index) {
                <div
                  class="selection-card"
                  [style.animation-delay.ms]="i * 50"
                  style="animation: cardSlideIn 0.3s ease both;"
                >
                  <div class="selection-info">
                    <span class="selection-name">{{ ev.name }}</span>
                    <span class="selection-venue">{{ ev.venue.name }}</span>
                    <span class="selection-time">
                      {{ formatTime(ev.startTime) }} – {{ formatTime(ev.endTime) }}
                    </span>
                  </div>
                  <div class="selection-controls">
                    <label class="stay-label">
                      <input
                        type="number"
                        class="stay-input"
                        [ngModel]="getStayMinutes(ev.id)"
                        (ngModelChange)="state.setStayMinutes(ev.id, $event)"
                        min="1"
                        max="480"
                      />
                      min
                    </label>
                    <button class="remove-btn" (click)="state.toggleEventSelection(ev.id)">
                      <span class="remove-x">✕</span>
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Compute button -->
            <button
              class="compute-btn"
              [class.computing]="state.computing()"
              [disabled]="state.computing()"
              (click)="onCompute()"
            >
              @if (state.computing()) {
                <span class="btn-loader"></span>
                <span>Computing route…</span>
              } @else if (state.spreePlan()) {
                <span>🔄</span>
                <span>Recompute Route</span>
              } @else {
                <span>🗺️</span>
                <span>Plan My Spree</span>
              }
            </button>

            <!-- Error -->
            @if (state.error()) {
              <div class="error-bar">
                <span>⚠️ {{ state.error() }}</span>
                <button class="error-retry" (click)="onCompute()">Retry</button>
              </div>
            }

            <!-- Warning -->
            @if (state.spreePlan()?.exceedsEndTime) {
              <app-time-warning />
            }

            <!-- Route list -->
            @if (state.spreePlan()) {
              <div class="route-reveal">
                <app-route-list [plan]="state.spreePlan()!" />
              </div>

              <!-- Save spree (authenticated only) -->
              @if (auth.isAuthenticated()) {
                <div class="save-section">
                  @if (savingSpree()) {
                    <button class="save-btn" disabled>
                      <span class="btn-loader"></span> Saving…
                    </button>
                  } @else if (savedMessage()) {
                    <div class="save-success">✅ {{ savedMessage() }}</div>
                  } @else {
                    <div class="save-row">
                      <input
                        type="text"
                        class="save-name-input"
                        placeholder="Name your spree…"
                        [value]="spreeName()"
                        (input)="spreeName.set($any($event.target).value)"
                      />
                      <button class="save-btn" (click)="saveSpree()">
                        💾 Save
                      </button>
                    </div>
                  }
                </div>
              }
            }
          } @else {
            <div class="empty-state">
              <span class="empty-icon">📍</span>
              <p class="empty-text">Tap event markers on the map to add them to your spree.</p>
              <p class="empty-hint">Hold Shift + click to set your home location.</p>
            </div>
          }

          <!-- Clear all -->
          @if (state.selectionCount() > 0) {
            <button class="clear-btn" (click)="state.clearSelections()">
              Clear All Selections
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Panel shell ── */
    .panel {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--surface);
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
      z-index: 100;
      max-height: 85vh;
      transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .panel:not(.expanded) {
      max-height: 80px;
    }
    .panel.has-plan:not(.expanded) {
      max-height: 84px;
      box-shadow: 0 -4px 24px rgba(99, 102, 241, 0.15);
    }
    .panel.pulse-success {
      animation: panelPulse 0.6s ease;
    }

    /* ── Handle ── */
    .handle-bar {
      display: flex;
      justify-content: center;
      padding: 8px 0 4px;
      border: none;
      background: transparent;
      cursor: pointer;
      width: 100%;
    }
    .handle-pill {
      width: 36px;
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      transition: width 0.2s;
    }
    .panel:not(.expanded) .handle-pill {
      animation: handleHint 3s ease 2s 2;
    }

    /* ── Header ── */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 20px 12px;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .spree-icon {
      font-size: 28px;
      transition: transform 0.3s ease;
    }
    .panel.has-plan .spree-icon {
      animation: iconBounce 0.5s ease;
    }
    .panel-title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-display);
    }
    .panel-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
    }
    .subtitle-warn {
      color: #f59e0b;
      font-weight: 600;
    }
    .selection-badge {
      width: 22px;
      height: 22px;
      background: var(--accent);
      color: white;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .expand-icon {
      font-size: 20px;
      color: var(--text-secondary);
      transition: transform 0.3s ease;
    }
    .expand-icon.flipped {
      transform: rotate(180deg);
    }

    /* ── Content ── */
    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 0 20px 24px;
      -webkit-overflow-scrolling: touch;
    }

    /* ── Selection cards ── */
    .selections-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }
    .selection-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: var(--surface-dim);
      border-radius: 12px;
      gap: 10px;
      transition: background 0.15s, transform 0.15s;
    }
    .selection-card:active {
      transform: scale(0.98);
    }
    .selection-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .selection-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .selection-venue {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .selection-time {
      font-size: 11px;
      color: var(--accent);
      font-weight: 500;
    }
    .selection-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .stay-label {
      font-size: 12px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .stay-input {
      width: 48px;
      padding: 4px 6px;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 13px;
      text-align: center;
      background: var(--surface);
      color: var(--text-primary);
      transition: border-color 0.15s;
    }
    .stay-input:focus {
      border-color: var(--accent);
    }
    .remove-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: #fee2e2;
      color: #dc2626;
      border-radius: 50%;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.1s, background 0.15s;
    }
    .remove-btn:active {
      transform: scale(0.85);
      background: #fecaca;
    }

    /* ── Compute button ── */
    .compute-btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 12px;
      background: var(--accent);
      color: white;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
      transition: transform 0.1s, opacity 0.15s, background 0.15s;
      position: relative;
      overflow: hidden;
    }
    .compute-btn:active:not(:disabled) {
      transform: scale(0.97);
    }
    .compute-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .compute-btn.computing {
      background: var(--accent-light);
    }
    .btn-loader {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* ── Error bar ── */
    .error-bar {
      padding: 10px 14px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 13px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      animation: fadeSlideIn 0.3s ease;
    }
    .error-retry {
      padding: 3px 12px;
      border: 1px solid #fca5a5;
      border-radius: 6px;
      background: white;
      color: #dc2626;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    /* ── Route reveal ── */
    .route-reveal {
      animation: fadeSlideUp 0.4s ease;
    }

    /* ── Empty state ── */
    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: var(--text-secondary);
      animation: fadeIn 0.3s ease;
    }
    .empty-icon {
      font-size: 40px;
      display: block;
      margin-bottom: 8px;
    }
    .empty-text {
      margin: 0 0 6px;
      font-size: 14px;
      line-height: 1.5;
    }
    .empty-hint {
      margin: 0;
      font-size: 12px;
      color: var(--text-muted);
      font-style: italic;
    }

    /* ── Clear button ── */
    .clear-btn {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      margin-top: 12px;
      transition: background 0.15s;
    }
    .clear-btn:active {
      background: var(--surface-dim);
    }

    /* ── Animations ── */
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes cardSlideIn {
      from { opacity: 0; transform: translateX(-12px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes panelPulse {
      0% { box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12); }
      50% { box-shadow: 0 -4px 32px rgba(99, 102, 241, 0.35); }
      100% { box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12); }
    }
    @keyframes iconBounce {
      0%, 100% { transform: scale(1); }
      40% { transform: scale(1.3); }
      70% { transform: scale(0.9); }
    }
    @keyframes handleHint {
      0%, 100% { width: 36px; }
      50% { width: 52px; }
    }

    /* ── Save section ── */
    .save-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .save-row {
      display: flex;
      gap: 8px;
    }
    .save-name-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 14px;
      background: var(--surface);
      color: var(--text-primary);
    }
    .save-name-input:focus {
      border-color: var(--accent);
      outline: none;
    }
    .save-btn {
      padding: 10px 18px;
      border: none;
      border-radius: 10px;
      background: var(--success);
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: opacity 0.15s;
    }
    .save-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .save-success {
      padding: 10px 14px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      color: #16a34a;
      font-size: 13px;
      font-weight: 500;
      text-align: center;
      animation: fadeSlideUp 0.3s ease;
    }
  `],
})
export class SpreePanelComponent {
  readonly state = inject(SpreeStateService);
  readonly auth = inject(AuthService);
  private readonly savedApi = inject(SavedSpreesApiService);

  readonly expanded = signal(false);
  readonly justComputed = signal(false);
  readonly spreeName = signal('My Spree');
  readonly savingSpree = signal(false);
  readonly savedMessage = signal<string | null>(null);

  constructor() {
    // Auto-expand panel when plan is computed
    effect(() => {
      const plan = this.state.spreePlan();
      if (plan) {
        this.expanded.set(true);
        this.justComputed.set(true);
        setTimeout(() => this.justComputed.set(false), 700);
      }
    });
  }

  toggle(): void {
    this.expanded.update((v) => !v);
  }

  async onCompute(): Promise<void> {
    await this.state.computeSpree();
  }

  getSelectedEvents() {
    const ids = this.state.selectedEventIds();
    return this.state.allEvents().filter((ev) => ids.has(ev.id));
  }

  getStayMinutes(eventId: string): number {
    return this.state.selections().get(eventId) || 10;
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  saveSpree(): void {
    const plan = this.state.spreePlan();
    if (!plan) return;

    const name = this.spreeName().trim() || 'My Spree';
    this.savingSpree.set(true);
    this.savedMessage.set(null);

    this.savedApi.save(name, plan).subscribe({
      next: (saved) => {
        this.savingSpree.set(false);
        this.savedMessage.set(`Saved "${saved.name}"`);
        setTimeout(() => this.savedMessage.set(null), 3000);
      },
      error: (err) => {
        this.savingSpree.set(false);
        console.error('Failed to save spree:', err);
      },
    });
  }
}
