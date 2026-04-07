import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services';

@Component({
  selector: 'app-auth-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (auth.isLoading()) {
      <div class="auth-chip skeleton">
        <div class="skeleton-circle"></div>
        <div class="skeleton-text"></div>
      </div>
    } @else if (auth.isAuthenticated()) {
      <div class="auth-chip authenticated">
        <div class="user-avatar">
          {{ getInitials() }}
        </div>
        <div class="user-info">
          <span class="user-name">{{ auth.displayName() }}</span>
          <div class="role-badges">
            @for (role of auth.userProfile()?.roles || []; track role) {
              @if (role !== 'default-roles-spree' && role !== 'offline_access' && role !== 'uma_authorization') {
                <span
                  class="role-badge"
                  [class.role-admin]="role === 'admin'"
                  [class.role-organizer]="role === 'organizer'"
                  [class.role-user]="role === 'user'"
                >{{ role }}</span>
              }
            }
          </div>
        </div>
        <button class="logout-btn" (click)="auth.logout()" title="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    } @else {
      <button class="auth-chip login-btn" (click)="auth.login()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span>Sign In</span>
      </button>
    }
  `,
  styles: [`
    .auth-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--surface);
      border-radius: 100px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      pointer-events: auto;
      font-size: 13px;
      animation: fadeSlideIn 0.3s ease;
    }

    /* ── Skeleton ── */
    .auth-chip.skeleton {
      min-width: 100px;
    }
    .skeleton-circle {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--surface-dim);
      animation: shimmer 1.5s ease infinite;
    }
    .skeleton-text {
      width: 56px;
      height: 12px;
      border-radius: 6px;
      background: var(--surface-dim);
      animation: shimmer 1.5s ease infinite 0.2s;
    }

    /* ── Login button ── */
    .login-btn {
      border: none;
      cursor: pointer;
      font-weight: 600;
      color: var(--accent);
      transition: transform 0.1s, opacity 0.15s;
    }
    .login-btn:active {
      transform: scale(0.95);
    }
    .login-btn svg {
      flex-shrink: 0;
    }

    /* ── Authenticated state ── */
    .authenticated {
      padding: 4px 8px 4px 4px;
    }
    .user-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .user-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100px;
    }
    .role-badges {
      display: flex;
      gap: 4px;
    }
    .role-badge {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1px 6px;
      border-radius: 100px;
      background: var(--surface-dim);
      color: var(--text-muted);
    }
    .role-badge.role-admin {
      background: #fef2f2;
      color: #dc2626;
    }
    .role-badge.role-organizer {
      background: #f0fdf4;
      color: #16a34a;
    }
    .role-badge.role-user {
      background: #eff6ff;
      color: #2563eb;
    }
    .logout-btn {
      width: 28px;
      height: 28px;
      min-height: 28px;
      min-width: 28px;
      border: none;
      background: var(--surface-dim);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-secondary);
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
      margin-left: 4px;
    }
    .logout-btn:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
  `],
})
export class AuthChipComponent {
  readonly auth = inject(AuthService);

  getInitials(): string {
    const p = this.auth.userProfile();
    if (!p) return '?';
    const first = p.firstName?.charAt(0) || '';
    const last = p.lastName?.charAt(0) || '';
    if (first || last) return (first + last).toUpperCase();
    return p.username?.charAt(0)?.toUpperCase() || '?';
  }
}
