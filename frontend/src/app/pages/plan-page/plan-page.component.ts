import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from '../../components/map/map.component';
import { SpreePanelComponent } from '../../components/spree-panel/spree-panel.component';
import { SettingsDrawerComponent } from '../../components/settings-drawer/settings-drawer.component';
import { AuthChipComponent } from '../../components/auth-chip/auth-chip.component';
import { SavedSpreesDrawerComponent } from '../../components/saved-sprees-drawer/saved-sprees-drawer.component';
import { FormsModule } from '@angular/forms';
import { EventGroupsApiService, SpreeStateService } from '../../services';

@Component({
  selector: 'app-plan-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MapComponent,
    SpreePanelComponent,
    SettingsDrawerComponent,
    AuthChipComponent,
    SavedSpreesDrawerComponent,
  ],
  template: `
    <div class="app-shell">
      <!-- Splash overlay -->
      @if (showSplash()) {
        <div class="splash" (click)="dismissSplash()">
          <div class="splash-content" (click)="$event.stopPropagation()">
            <span class="splash-logo">🎪</span>
            <h1 class="splash-title">Spree</h1>
            <p class="splash-tagline">Plan your perfect event-hopping route</p>
            <div class="splash-steps">
              <div class="splash-step">
                <span class="step-num">1</span>
                <span>Sign in to save & load your sprees</span>
              </div>
              <div class="splash-step">
                <span class="step-num">2</span>
                <span>Tap markers to add events</span>
              </div>
              <div class="splash-step">
                <span class="step-num">3</span>
                <span>Hit "Plan My Spree" for your route</span>
              </div>
            </div>
            <button class="splash-btn" (click)="dismissSplash()">Let's Go</button>
          </div>
        </div>
      }

      <!-- Top bar -->
      <header class="top-bar">
        <div class="top-bar-row1">
          <div class="logo">
            <span class="logo-icon">🎪</span>
            <span class="logo-text">Spree</span>
          </div>
          <div class="top-bar-right">
            <app-auth-chip />
          </div>
        </div>

        <!-- Event group selector + date picker -->
        @if (state.eventGroups().length > 0) {
          <div class="top-bar-row2">
            <div class="group-select-wrapper">
              <select
                [ngModel]="state.selectedGroupId()"
                (ngModelChange)="onGroupChange($event)">
                <option [ngValue]="null" disabled>Choose event group…</option>
                @for (group of state.eventGroups(); track group.id) {
                  <option [ngValue]="group.id">{{ group.name }} ({{ group.eventCount }})</option>
                }
              </select>
            </div>
            <div class="date-picker-wrapper">
              <input
                type="date"
                [ngModel]="state.selectedDate()"
                (ngModelChange)="onDateChange($event)" />
            </div>
          </div>
        }
      </header>

      <!-- Loading overlay for events -->
      @if (eventsLoading()) {
        <div class="events-loading-bar">
          <div class="loading-shimmer"></div>
          <span>Discovering events near you…</span>
        </div>
      }

      <!-- Events load error -->
      @if (eventsError()) {
        <div class="events-error-bar">
          <span>⚠️ {{ eventsError() }}</span>
          <button class="retry-btn" (click)="loadGroups()">Retry</button>
        </div>
      }

      <!-- Map fills the viewport -->
      <main class="map-area">
        <app-map />
      </main>

      <!-- Map legend -->
      <div class="map-legend">
        <div class="legend-item">
          <span class="legend-dot" style="background: #6366f1;"></span>
          <span>Available</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #10b981;"></span>
          <span>Selected</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #f59e0b;"></span>
          <span>Over time</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #94a3b8;"></span>
          <span>Outside window</span>
        </div>
      </div>

      <!-- Settings FAB + drawer -->
      <app-settings-drawer />

      <!-- Saved sprees FAB + drawer (auth-gated) -->
      <app-saved-sprees-drawer />

      <!-- Bottom panel -->
      <app-spree-panel />
    </div>
  `,
  styles: [`
    .app-shell {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      overflow: hidden;
    }

    /* ── Top bar ── */
    .top-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 80;
      padding: 12px 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    }
    .top-bar-row1 {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .top-bar-right {
      margin-left: auto;
      pointer-events: auto;
    }
    .top-bar-row2 {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--surface);
      border-radius: 100px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      pointer-events: auto;
      flex-shrink: 0;
    }
    .logo-icon { font-size: 22px; }
    .logo-text {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 800;
      color: var(--accent);
      letter-spacing: -0.03em;
    }
    .group-select-wrapper {
      pointer-events: auto;
      animation: fadeSlideIn 0.4s ease;
      flex: 1;
      min-width: 0;
    }
    .group-select-wrapper select {
      width: 100%;
      padding: 6px 14px;
      background: var(--surface);
      border: 1px solid var(--border, rgba(0,0,0,0.1));
      border-radius: 100px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      outline: none;
      appearance: none;
      padding-right: 28px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
    }
    .group-select-wrapper select:focus {
      border-color: var(--accent);
    }
    .date-picker-wrapper {
      pointer-events: auto;
      animation: fadeSlideIn 0.4s ease;
      flex-shrink: 0;
    }
    .date-picker-wrapper input[type="date"] {
      padding: 6px 14px;
      background: var(--surface);
      border: 1px solid var(--border, rgba(0,0,0,0.1));
      border-radius: 100px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      outline: none;
    }
    .date-picker-wrapper input[type="date"]:focus {
      border-color: var(--accent);
    }
    @media (min-width: 600px) {
      .top-bar-row1, .top-bar-row2 {
        width: auto;
      }
      .top-bar-row2 {
        flex: 1;
        min-width: 0;
      }
      .top-bar-right {
        margin-left: auto;
      }
    }

    /* ── Map area ── */
    .map-area {
      flex: 1;
      position: relative;
    }

    /* ── Map legend ── */
    .map-legend {
      position: fixed;
      bottom: 96px;
      left: 12px;
      z-index: 80;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 12px;
      background: var(--surface);
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      font-size: 11px;
      color: var(--text-secondary);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ── Events loading bar ── */
    .events-loading-bar {
      position: fixed;
      top: 110px;
      left: 16px;
      right: 16px;
      z-index: 79;
      padding: 10px 16px;
      background: var(--surface);
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      font-size: 13px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 12px;
      overflow: hidden;
      animation: fadeSlideIn 0.3s ease;
    }
    .loading-shimmer {
      width: 20px; height: 20px;
      border-radius: 50%;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      animation: spin 0.7s linear infinite;
    }

    /* ── Events error bar ── */
    .events-error-bar {
      position: fixed;
      top: 110px;
      left: 16px;
      right: 16px;
      z-index: 79;
      padding: 10px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      font-size: 13px;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      animation: fadeSlideIn 0.3s ease;
    }
    .retry-btn {
      padding: 4px 14px;
      border: 1px solid #fca5a5;
      border-radius: 8px;
      background: white;
      color: #dc2626;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    /* ── Splash ── */
    .splash {
      position: fixed; inset: 0; z-index: 500;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      animation: fadeIn 0.3s ease;
    }
    .splash-content {
      background: var(--surface);
      border-radius: 24px;
      padding: 40px 32px 32px;
      max-width: 340px; width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .splash-logo { font-size: 56px; display: block; margin-bottom: 8px; }
    .splash-title {
      font-family: var(--font-display);
      font-size: 36px; font-weight: 800;
      color: var(--accent);
      margin: 0 0 4px; letter-spacing: -0.03em;
    }
    .splash-tagline {
      font-size: 14px; color: var(--text-secondary); margin: 0 0 24px;
    }
    .splash-steps {
      display: flex; flex-direction: column; gap: 12px;
      text-align: left; margin-bottom: 28px;
    }
    .splash-step {
      display: flex; align-items: center; gap: 12px;
      font-size: 14px; color: var(--text-primary);
    }
    .step-num {
      width: 28px; height: 28px;
      background: var(--accent); color: white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; flex-shrink: 0;
    }
    .splash-btn {
      width: 100%; padding: 14px; border: none; border-radius: 14px;
      background: var(--accent); color: white;
      font-size: 16px; font-weight: 700; cursor: pointer;
    }
    .splash-btn:active { transform: scale(0.97); opacity: 0.9; }

    /* ── Animations ── */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  `],
})
export class PlanPageComponent implements OnInit {
  private readonly eventGroupsApi = inject(EventGroupsApiService);
  readonly state = inject(SpreeStateService);

  readonly eventsLoading = signal(true);
  readonly eventsError = signal<string | null>(null);
  readonly showSplash = signal(true);

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.eventsLoading.set(true);
    this.eventsError.set(null);

    this.eventGroupsApi.getAll().subscribe({
      next: (groups) => {
        this.state.setEventGroups(groups);
        if (groups.length > 0) {
          this.loadGroup(groups[0].id);
        } else {
          this.eventsLoading.set(false);
        }
      },
      error: () => {
        this.eventsError.set('Could not load event groups. Check your connection.');
        this.eventsLoading.set(false);
      },
    });
  }

  loadGroup(groupId: string): void {
    const date = this.state.selectedDate();
    this.eventsLoading.set(true);
    this.eventsError.set(null);

    this.eventGroupsApi.getByIdAtDate(groupId, date).subscribe({
      next: (group) => {
        this.state.setEventsFromGroup(group);
        this.eventsLoading.set(false);
      },
      error: () => {
        this.eventsError.set('Could not load event group.');
        this.eventsLoading.set(false);
      },
    });
  }

  onGroupChange(groupId: string): void {
    this.loadGroup(groupId);
  }

  onDateChange(date: string): void {
    this.state.selectedDate.set(date);
    const groupId = this.state.selectedGroupId();
    if (groupId) {
      this.loadGroup(groupId);
    }
  }

  dismissSplash(): void {
    this.showSplash.set(false);
  }
}
