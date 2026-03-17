import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/main/main').then(m => m.MainComponent),
  },
  {
    path: 'events',
    loadComponent: () => import('./pages/events/events').then(m => m.EventsComponent),
  },
  {
    path: 'venues',
    loadComponent: () => import('./pages/venues/venues').then(m => m.VenuesComponent),
  },
  {
    path: 'spree',
    loadComponent: () => import('./pages/spree/spree').then(m => m.SpreeComponent),
  },
];