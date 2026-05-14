import { Routes } from '@angular/router';

export const STUDIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@modules/studio/studio/ui/index-studio/index-studio').then(
        (m) => m.IndexStudio,
      ),
  },
];
