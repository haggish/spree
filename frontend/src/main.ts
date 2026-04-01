import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAuth, LogLevel } from 'angular-auth-oidc-client';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/services/auth.interceptor';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),

    // OIDC configuration for Keycloak
    provideAuth({
      config: {
        authority: environment.keycloak.authority,
        redirectUrl: environment.keycloak.redirectUrl,
        postLogoutRedirectUri: environment.keycloak.postLogoutRedirectUri,
        clientId: environment.keycloak.clientId,
        scope: environment.keycloak.scope,
        responseType: 'code',
        silentRenew: true,
        useRefreshToken: true,
        logLevel: environment.production ? LogLevel.Error : LogLevel.Debug,
        secureRoutes: ['/api'],
        // Keycloak-specific: the OIDC discovery endpoint
        authWellknownEndpointUrl: `${environment.keycloak.authority}/.well-known/openid-configuration`,
      },
    }),
  ],
}).catch((err) => console.error(err));
