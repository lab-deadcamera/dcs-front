import { Routes } from '@angular/router';

import { AUTH_PATHS } from '@core/constants';

export const AUTH_ROUTES: Routes = [
  {
    path: AUTH_PATHS.login,
    loadComponent: () => import('./ui/pages/login/login'),
  },
  {
    path: AUTH_PATHS.logout,
    loadComponent: () => import('./ui/pages/logout/logout'),
  },
  {
    path: '',
    redirectTo: AUTH_PATHS.login,
    pathMatch: 'full',
  },
];
