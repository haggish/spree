import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NextEventCardComponent } from './next-event-card.component';
import { LiveRouteListComponent } from './live-route-list.component';

@Component({
  selector: 'app-live-bottom-bar',
  standalone: true,
  imports: [CommonModule, NextEventCardComponent, LiveRouteListComponent],
  template: `
    <div class="bottom-bar" [class.expanded]="expanded()">
      <!-- Handle -->
      <button class="handle" (click)="expanded.set(!expanded())">
        <span class="handle-pill"></span>
      </button>

      <!-- Tab toggle -->
      <div class="tabs">
        <button
          class="tab"
          [class.active]="activeTab() === 'next'"
          (click)="activeTab.set('next')">
          Next
        </button>
        <button
          class="tab"
          [class.active]="activeTab() === 'route'"
          (click)="activeTab.set('route')">
          Route
        </button>
      </div>

      <!-- Content -->
      @if (expanded()) {
        <div class="content">
          @if (activeTab() === 'next') {
            <app-next-event-card />
          } @else {
            <app-live-route-list />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .bottom-bar {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 90;
      background: var(--surface);
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
      transition: max-height 0.3s ease;
      max-height: 80px;
      overflow: hidden;
    }
    .bottom-bar.expanded {
      max-height: 70vh;
      overflow-y: auto;
    }
    .handle {
      display: flex; justify-content: center; padding: 10px;
      border: none; background: none; cursor: pointer; width: 100%;
    }
    .handle-pill {
      width: 36px; height: 4px; border-radius: 2px;
      background: var(--border);
    }
    .tabs {
      display: flex; gap: 4px; padding: 0 16px 8px;
    }
    .tab {
      flex: 1; padding: 8px; border: none; border-radius: 10px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      background: var(--surface-dim); color: var(--text-secondary);
      transition: all 0.15s;
    }
    .tab.active {
      background: var(--accent); color: white;
    }
    .tab:active { transform: scale(0.97); }
    .content {
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `],
})
export class LiveBottomBarComponent {
  readonly activeTab = signal<'next' | 'route'>('next');
  readonly expanded = signal(true);
}
