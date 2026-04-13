import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProximityService, LiveSpreeStateService } from '../../../services';

@Component({
  selector: 'app-proximity-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (proximity.nearNextVenue() && !liveState.checkedInEventId()) {
      <div class="banner">
        <span class="banner-text">
          📍 At {{ proximity.nearVenueName() }}?
        </span>
        <button class="banner-btn" (click)="checkIn()">Check In</button>
      </div>
    }
  `,
  styles: [`
    .banner {
      position: fixed;
      top: 72px;
      left: 16px;
      right: 16px;
      z-index: 90;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #10b981;
      color: white;
      border-radius: 14px;
      box-shadow: 0 4px 20px rgba(16,185,129,0.4);
      animation: slideDown 0.3s ease;
    }
    .banner-text { font-size: 14px; font-weight: 600; }
    .banner-btn {
      padding: 8px 20px;
      border: none;
      border-radius: 10px;
      background: white;
      color: #10b981;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .banner-btn:active { opacity: 0.8; }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class ProximityBannerComponent {
  readonly proximity = inject(ProximityService);
  readonly liveState = inject(LiveSpreeStateService);

  checkIn(): void {
    const nextLeg = this.liveState.nextLeg();
    if (nextLeg) {
      this.liveState.checkIn(nextLeg.event.id);
    }
  }
}
