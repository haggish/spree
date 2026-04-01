export const environment = {
  production: false,
  apiUrl: '/api',
  googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',

  // Keycloak OIDC configuration
  keycloak: {
    authority: 'http://localhost:8080/realms/spree',
    clientId: 'spree-frontend',
    redirectUrl: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    scope: 'openid profile email roles',
  },
};
