import { Routes } from '@angular/router';

import { AUTH_PATHS } from '@core/constants';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@shared/components/private-layout/private-layout.component').then(m => m.PrivateLayout),
    children: [
      {
        path: '',
        loadChildren: () => import('@modules/home/home.routes').then(m => m.HOME_ROUTES),
      },
      {
        path: 'studio',
        loadChildren: () => import('@modules/studio/studio.routes').then(m => m.STUDIO_ROUTES),
      },
      // Characters: launched inline from the studio's "My Assets" section
      // (CharacterAssetsComponent embeds <app-index-characters> in a dialog),
      // so it no longer needs its own top-level route.
      {
        path: 'files',
        loadChildren: () =>
          import('@modules/files/files.routes').then((m) => m.FILES_ROUTES),
      },
    ],
  },
  {
    path: AUTH_PATHS.root,
    loadComponent: () => import('@shared/components/public-layout/public-layout.component').then(m => m.PublicLayout),
    children: [
      {
        path: '',
        loadChildren: () => import('@modules/auth/auth.routes').then(m => m.AUTH_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
