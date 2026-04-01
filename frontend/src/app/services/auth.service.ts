import { Injectable, inject, signal, computed } from '@angular/core';
import { OidcSecurityService, LoginResponse } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oidc = inject(OidcSecurityService);

  // ── Reactive state ──
  readonly isAuthenticated = signal(false);
  readonly userProfile = signal<UserProfile | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly isLoading = signal(true);

  // ── Derived ──
  readonly isOrganizer = computed(() => {
    const profile = this.userProfile();
    return profile?.roles.includes('organizer') || profile?.roles.includes('admin') || false;
  });

  readonly isAdmin = computed(() => {
    const profile = this.userProfile();
    return profile?.roles.includes('admin') || false;
  });

  readonly displayName = computed(() => {
    const profile = this.userProfile();
    if (!profile) return '';
    if (profile.firstName) return profile.firstName;
    return profile.username;
  });

  /**
   * Initialize auth state — call once on app startup.
   * Handles the OIDC callback if returning from Keycloak.
   */
  async init(): Promise<void> {
    this.isLoading.set(true);

    try {
      const result: LoginResponse = await firstValueFrom(this.oidc.checkAuth());
      this.updateState(result);
    } catch (err) {
      console.warn('Auth init failed (Keycloak may be down):', err);
      this.isAuthenticated.set(false);
      this.userProfile.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Redirect to Keycloak login page.
   */
  login(): void {
    this.oidc.authorize();
  }

  /**
   * Logout: clear local state + redirect to Keycloak logout.
   */
  logout(): void {
    this.oidc.logoff().subscribe(() => {
      this.isAuthenticated.set(false);
      this.userProfile.set(null);
      this.accessToken.set(null);
    });
  }

  /**
   * Get the current access token (for manual use if needed).
   */
  async getToken(): Promise<string | null> {
    try {
      const token = await firstValueFrom(this.oidc.getAccessToken());
      return token || null;
    } catch {
      return null;
    }
  }

  /**
   * Parse token payload and update signals.
   */
  private updateState(result: LoginResponse): void {
    this.isAuthenticated.set(result.isAuthenticated);

    if (result.isAuthenticated && result.accessToken) {
      this.accessToken.set(result.accessToken);

      // Decode JWT payload (middle segment)
      try {
        const payload = JSON.parse(atob(result.accessToken.split('.')[1]));
        const roles: string[] = payload.realm_roles
          || payload.realm_access?.roles
          || [];

        this.userProfile.set({
          id: payload.sub,
          username: payload.preferred_username,
          email: payload.email,
          firstName: payload.given_name,
          lastName: payload.family_name,
          roles,
        });
      } catch (e) {
        console.error('Failed to decode token:', e);
        this.userProfile.set(null);
      }
    } else {
      this.accessToken.set(null);
      this.userProfile.set(null);
    }
  }
}
