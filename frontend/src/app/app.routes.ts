import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'plan', pathMatch: 'full' },
  {
    path: 'plan',
    loadComponent: () =>
      import('./pages/plan-page/plan-page.component').then((m) => m.PlanPageComponent),
  },
  {
    path: 'live/:id',
    loadComponent: () =>
      import('./pages/live-spree/live-spree.component').then((m) => m.LiveSpreeComponent),
    canActivate: [authGuard],
  },
];
