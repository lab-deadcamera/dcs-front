import { Routes } from '@angular/router';

export const PROVIDERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./providers/ui/index-providers/index-providers').then((m) => m.IndexProviders),
  },
];
