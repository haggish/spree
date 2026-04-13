import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LiveSpreeStateService, GeolocationService, ProximityService,
} from '../../services';
import { LiveMapComponent } from './components/live-map.component';
import { LiveBottomBarComponent } from './components/live-bottom-bar.component';
import { ProximityBannerComponent } from './components/proximity-banner.component';

@Component({
  selector: 'app-live-spree',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LiveMapComponent,
    LiveBottomBarComponent,
    ProximityBannerComponent,
  ],
  template: `
    <div class="live-shell">
      <!-- Header -->
      <header class="live-header">
        <a routerLink="/plan" class="back-link">← Plan</a>
        <div class="live-logo">
          <span class="logo-icon">🎪</span>
          <span class="logo-text">Spree</span>
          <span class="live-badge">LIVE</span>
        </div>
        @if (liveState.computing()) {
          <div class="computing-indicator">
            <div class="mini-spinner"></div>
          </div>
        }
      </header>

      <!-- Error bar -->
      @if (liveState.error()) {
        <div class="error-bar">
          <span>⚠️ {{ liveState.error() }}</span>
        </div>
      }

      <!-- Geolocation error -->
      @if (geo.error()) {
        <div class="geo-error-bar">
          <span>📍 {{ geo.error() }}</span>
          <span class="geo-hint">Location access is required for Live Spree</span>
        </div>
      }

      <!-- Loading state -->
      @if (!liveState.currentPlan()) {
        <div class="loading-state">
          <div class="loader-ring"></div>
          <span>Loading spree...</span>
        </div>
      }

      <!-- Map -->
      <main class="map-area">
        <app-live-map />
      </main>

      <!-- Map legend -->
      <div class="map-legend">
        <div class="legend-item">
          <span class="legend-dot" style="background: #4f46e5;"></span>
          <span>Next</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #6366f1;"></span>
          <span>Upcoming</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #10b981;"></span>
          <span>Checked in</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #94a3b8;"></span>
          <span>Visited</span>
        </div>
      </div>

      <!-- Proximity banner -->
      <app-proximity-banner />

      <!-- Bottom bar -->
      <app-live-bottom-bar />
    </div>
  `,
  styles: [`
    .live-shell {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      overflow: hidden;
    }

    .live-header {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 80;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      pointer-events: none;
    }
    .back-link {
      padding: 6px 14px;
      background: var(--surface);
      border-radius: 100px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      font-size: 13px;
      font-weight: 600;
      color: var(--accent);
      text-decoration: none;
      pointer-events: auto;
    }
    .back-link:active { opacity: 0.8; }
    .live-logo {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: var(--surface);
      border-radius: 100px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      pointer-events: auto;
    }
    .logo-icon { font-size: 18px; }
    .logo-text {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 800;
      color: var(--accent);
    }
    .live-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 8px;
      background: #dc2626;
      color: white;
      border-radius: 100px;
      letter-spacing: 0.1em;
      animation: livePulse 2s ease infinite;
    }
    @keyframes livePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    .computing-indicator {
      margin-left: auto;
      padding: 6px 12px;
      background: var(--surface);
      border-radius: 100px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      pointer-events: auto;
    }
    .mini-spinner {
      width: 16px; height: 16px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    .map-area { flex: 1; position: relative; }

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
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

    .error-bar {
      position: fixed; top: 56px; left: 16px; right: 16px; z-index: 85;
      padding: 10px 16px; background: #fef2f2; border: 1px solid #fecaca;
      border-radius: 12px; font-size: 13px; color: #dc2626;
    }
    .geo-error-bar {
      position: fixed; top: 56px; left: 16px; right: 16px; z-index: 85;
      padding: 10px 16px; background: #fffbeb; border: 1px solid #fde68a;
      border-radius: 12px; font-size: 13px; color: #92400e;
      display: flex; flex-direction: column; gap: 2px;
    }
    .geo-hint { font-size: 11px; color: #b45309; }

    .loading-state {
      position: fixed; inset: 0; z-index: 70;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; background: var(--bg);
      font-size: 14px; color: var(--text-secondary);
    }
    .loader-ring {
      width: 24px; height: 24px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class LiveSpreeComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly liveState = inject(LiveSpreeStateService);
  readonly geo = inject(GeolocationService);
  private readonly proximity = inject(ProximityService); // inject to activate effects

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.geo.startWatching();
    await this.liveState.loadSpree(id);
    await this.liveState.startLive();
  }

  ngOnDestroy(): void {
    this.geo.stopWatching();
    this.liveState.reset();
  }
}
