export const environment = {
  production: true,
  apiUrl: '/api',
  googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',

  keycloak: {
    authority: 'https://your-keycloak.example.com/realms/spree',
    clientId: 'spree-frontend',
    redirectUrl: 'https://your-app.example.com',
    postLogoutRedirectUri: 'https://your-app.example.com',
    scope: 'openid profile email roles',
  },
};
