import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, SavedSpreesApiService, SpreeStateService } from '../../services';
import { SavedSpree } from '../../services/saved-sprees-api.service';

@Component({
  selector: 'app-saved-sprees-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- FAB only visible when authenticated -->
    @if (auth.isAuthenticated()) {
      <button class="saved-fab" (click)="openDrawer()" aria-label="Saved Sprees">
        💾
        @if (sprees().length > 0) {
          <span class="fab-count">{{ sprees().length }}</span>
        }
      </button>
    }

    @if (open()) {
      <div class="overlay" (click)="open.set(false)"></div>
      <div class="drawer">
        <div class="drawer-header">
          <h2>Saved Sprees</h2>
          <button class="close-btn" (click)="open.set(false)">✕</button>
        </div>

        <div class="drawer-body">
          @if (loading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <span>Loading your sprees…</span>
            </div>
          } @else if (error()) {
            <div class="error-state">
              <span>⚠️ {{ error() }}</span>
              <button class="retry-btn" (click)="loadSprees()">Retry</button>
            </div>
          } @else if (sprees().length === 0) {
            <div class="empty-state">
              <span class="empty-icon">📭</span>
              <p>No saved sprees yet.</p>
              <p class="empty-hint">Compute a route and hit "Save Spree" to keep it here.</p>
            </div>
          } @else {
            <div class="sprees-list">
              @for (spree of sprees(); track spree.id) {
                <div class="spree-card">
                  <div class="spree-info" (click)="loadSpree(spree)">
                    <span class="spree-name">{{ spree.name }}</span>
                    <span class="spree-meta">
                      {{ spree.plan.legs.length }} stops ·
                      {{ spree.plan.totalDurationMinutes }} min ·
                      {{ formatDate(spree.createdAt) }}
                    </span>
                    @if (spree.plan.exceedsEndTime) {
                      <span class="spree-warn">⚠️ Exceeds time window</span>
                    }
                  </div>
                  <div class="spree-actions">
                    <button
                      class="live-btn"
                      (click)="goLive(spree.id)"
                      title="Start Live Spree"
                    >
                      ▶ Live
                    </button>
                    <button
                      class="load-btn"
                      (click)="loadSpree(spree)"
                      title="Load this spree"
                    >
                      Load
                    </button>
                    <button
                      class="delete-btn"
                      (click)="deleteSpree(spree.id)"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .saved-fab {
      position: fixed;
      top: 68px;
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
    .fab-count {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 18px;
      height: 18px;
      background: var(--accent);
      color: white;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--surface);
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
      width: min(360px, 88vw);
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
      min-height: 32px;
      min-width: 32px;
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
      padding: 16px 20px;
    }

    /* States */
    .loading-state, .empty-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 40px 16px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 14px;
    }
    .spinner {
      width: 24px; height: 24px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-icon { font-size: 36px; }
    .empty-hint { font-size: 12px; color: var(--text-muted); margin: 0; }
    .error-state {
      color: #dc2626;
    }
    .retry-btn {
      padding: 6px 16px;
      border: 1px solid #fca5a5;
      border-radius: 8px;
      background: white;
      color: #dc2626;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Spree cards */
    .sprees-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .spree-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: var(--surface-dim);
      border-radius: 12px;
      gap: 10px;
      transition: background 0.15s;
    }
    .spree-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
      cursor: pointer;
    }
    .spree-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .spree-meta {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .spree-warn {
      font-size: 11px;
      color: #f59e0b;
      font-weight: 500;
    }
    .spree-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    .live-btn {
      padding: 6px 14px;
      border: none;
      border-radius: 8px;
      background: #dc2626;
      color: white;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      min-height: 32px;
      min-width: auto;
    }
    .live-btn:active { opacity: 0.8; }
    .load-btn {
      padding: 6px 14px;
      border: none;
      border-radius: 8px;
      background: var(--accent);
      color: white;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      min-height: 32px;
      min-width: auto;
    }
    .delete-btn {
      width: 32px;
      height: 32px;
      min-height: 32px;
      min-width: 32px;
      border: none;
      background: #fee2e2;
      color: #dc2626;
      border-radius: 50%;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `],
})
export class SavedSpreesDrawerComponent {
  readonly auth = inject(AuthService);
  private readonly savedApi = inject(SavedSpreesApiService);
  private readonly spreeState = inject(SpreeStateService);
  private readonly router = inject(Router);

  readonly open = signal(false);
  readonly sprees = signal<SavedSpree[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  openDrawer(): void {
    this.open.set(true);
    this.loadSprees();
  }

  loadSprees(): void {
    this.loading.set(true);
    this.error.set(null);

    this.savedApi.getAll().subscribe({
      next: (sprees) => {
        this.sprees.set(sprees);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load saved sprees');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  loadSpree(spree: SavedSpree): void {
    // Restore the spree plan into the app state
    const plan = spree.plan;
    this.spreeState.updateConfig({
      homeLocation: plan.homeLocation,
      startTime: plan.startTime,
      endTime: plan.endTime,
    });

    // Restore selections from plan legs
    const selections = new Map<string, number>();
    for (const leg of plan.legs) {
      selections.set(leg.event.id, leg.stayMinutes);
    }
    this.spreeState.selections.set(selections);
    this.spreeState.spreePlan.set(plan);

    this.open.set(false);
  }

  goLive(id: string): void {
    this.open.set(false);
    this.router.navigate(['/live', id]);
  }

  deleteSpree(id: string): void {
    this.savedApi.delete(id).subscribe({
      next: () => {
        this.sprees.update((list) => list.filter((s) => s.id !== id));
      },
      error: (err) => console.error('Delete failed:', err),
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
