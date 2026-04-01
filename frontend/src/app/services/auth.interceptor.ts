import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * HTTP interceptor that attaches the Keycloak access token
 * as a Bearer header to all /api requests.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Only attach token to our backend API calls
  if (req.url.startsWith('/api') || req.url.includes('/api/')) {
    const token = auth.accessToken();

    if (token) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      return next(cloned);
    }
  }

  return next(req);
};
