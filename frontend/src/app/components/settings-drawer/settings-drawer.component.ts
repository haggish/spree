import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpreeStateService } from '../../services';

@Component({
  selector: 'app-settings-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button class="settings-fab" (click)="open.set(true)" aria-label="Settings">
      ⚙️
    </button>

    @if (open()) {
      <div class="overlay" (click)="open.set(false)"></div>
      <div class="drawer">
        <div class="drawer-header">
          <h2>Spree Settings</h2>
          <button class="close-btn" (click)="open.set(false)">✕</button>
        </div>

        <div class="drawer-body">
          <!-- Home location -->
          <div class="field-group">
            <label class="field-label">Home Location</label>
            <div class="coord-row">
              <div class="coord-field">
                <label>Lat</label>
                <input
                  type="number"
                  step="0.001"
                  [ngModel]="state.config().homeLocation.lat"
                  (ngModelChange)="updateLat($event)"
                />
              </div>
              <div class="coord-field">
                <label>Lng</label>
                <input
                  type="number"
                  step="0.001"
                  [ngModel]="state.config().homeLocation.lng"
                  (ngModelChange)="updateLng($event)"
                />
              </div>
            </div>
            <p class="field-hint">Tip: Click the map while holding Shift to set home location.</p>
          </div>

          <!-- Start time -->
          <div class="field-group">
            <label class="field-label">Spree Start Time</label>
            <input
              type="datetime-local"
              class="time-input"
              [ngModel]="toDatetimeLocal(state.config().startTime)"
              (ngModelChange)="updateStartTime($event)"
            />
          </div>

          <!-- End time -->
          <div class="field-group">
            <label class="field-label">Spree End Time</label>
            <input
              type="datetime-local"
              class="time-input"
              [ngModel]="toDatetimeLocal(state.config().endTime)"
              (ngModelChange)="updateEndTime($event)"
            />
          </div>

          <!-- Optimization strategy -->
          <div class="field-group">
            <label class="field-label">Route Optimization</label>
            <div class="strategy-selector">
              @for (strat of strategies; track strat.value) {
                <button
                  class="strategy-btn"
                  [class.active]="state.config().strategy === strat.value"
                  (click)="state.updateConfig({ strategy: strat.value })"
                >
                  <span class="strategy-icon">{{ strat.icon }}</span>
                  <div class="strategy-text">
                    <span class="strategy-name">{{ strat.label }}</span>
                    <span class="strategy-desc">{{ strat.description }}</span>
                  </div>
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .settings-fab {
      position: fixed;
      top: 120px;
      right: 16px;
      z-index: 90;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: var(--surface);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 200;
    }
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(340px, 85vw);
      background: var(--surface);
      z-index: 201;
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
      animation: slideIn 0.25s ease;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      border-bottom: 1px solid var(--border);
    }
    .drawer-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      font-family: var(--font-display);
    }
    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: var(--surface-dim);
      border-radius: 50%;
      font-size: 16px;
      cursor: pointer;
      color: var(--text-secondary);
    }
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .field-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .coord-row {
      display: flex;
      gap: 12px;
    }
    .coord-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .coord-field label {
      font-size: 11px;
      color: var(--text-secondary);
    }
    .coord-field input, .time-input {
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      background: var(--surface);
      color: var(--text-primary);
      width: 100%;
      box-sizing: border-box;
    }
    .field-hint {
      margin: 0;
      font-size: 12px;
      color: var(--text-secondary);
      font-style: italic;
    }

    /* ── Strategy selector ── */
    .strategy-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .strategy-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: transparent;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
    }
    .strategy-btn.active {
      border-color: var(--accent);
      background: var(--accent-faint);
    }
    .strategy-icon { font-size: 22px; flex-shrink: 0; }
    .strategy-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .strategy-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .strategy-btn.active .strategy-name {
      color: var(--accent);
    }
    .strategy-desc {
      font-size: 11px;
      color: var(--text-secondary);
      line-height: 1.3;
    }
  `],
})
export class SettingsDrawerComponent {
  readonly state = inject(SpreeStateService);
  readonly open = signal(false);

  readonly strategies = [
    {
      value: 'greedy',
      label: 'Smart Route',
      icon: '🧠',
      description: 'Minimizes travel and wait time between events',
    },
    {
      value: 'time-sort',
      label: 'By Start Time',
      icon: '🕐',
      description: 'Visit events in chronological order',
    },
  ];

  updateLat(lat: number): void {
    const current = this.state.config().homeLocation;
    this.state.setHomeLocation({ lat, lng: current.lng });
  }

  updateLng(lng: number): void {
    const current = this.state.config().homeLocation;
    this.state.setHomeLocation({ lat: current.lat, lng });
  }

  updateStartTime(value: string): void {
    if (value) {
      this.state.updateConfig({ startTime: new Date(value).toISOString() });
    }
  }

  updateEndTime(value: string): void {
    if (value) {
      this.state.updateConfig({ endTime: new Date(value).toISOString() });
    }
  }

  toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
