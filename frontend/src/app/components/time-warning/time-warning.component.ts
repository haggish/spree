import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpreeStateService } from '../../services';

@Component({
  selector: 'app-time-warning',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="warning-bar">
      <span class="warning-icon">⚠️</span>
      <div class="warning-text">
        <strong>Spree exceeds your end time</strong>
        <span>
          Your route takes {{ state.spreePlan()!.totalDurationMinutes }} minutes,
          but your spree window is
          {{ getWindowMinutes() }} minutes. Consider removing an event or shortening stay times.
        </span>
      </div>
    </div>
  `,
  styles: [`
    .warning-bar {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      margin-bottom: 12px;
    }
    .warning-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    .warning-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 13px;
      color: #92400e;
      line-height: 1.4;
    }
    .warning-text strong {
      font-weight: 700;
      color: #78350f;
    }
  `],
})
export class TimeWarningComponent {
  readonly state = inject(SpreeStateService);

  getWindowMinutes(): number {
    const cfg = this.state.config();
    const start = new Date(cfg.startTime).getTime();
    const end = new Date(cfg.endTime).getTime();
    return Math.round((end - start) / 60000);
  }
}
