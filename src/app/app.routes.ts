import { Routes } from '@angular/router';

import { AUTH_PATHS, PRIVATE_PATHS } from '@core/constants';
import { authGuard } from '@core/guards/auth.guard';
import { adminGuard } from '@core/guards/admin.guard';
import { directorGuard } from '@core/guards/director.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@shared/components/private-layout/private-layout.component').then(
        (m) => m.PrivateLayout,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('@modules/home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: PRIVATE_PATHS.studio,
        loadChildren: () => import('@modules/studio/studio.routes').then((m) => m.STUDIO_ROUTES),
      },
      {
        path: PRIVATE_PATHS.files,
        loadChildren: () => import('@modules/files/files.routes').then((m) => m.FILES_ROUTES),
      },
      {
        path: PRIVATE_PATHS.projects,
        loadChildren: () =>
          import('@modules/projects/projects.routes').then((m) => m.PROJECTS_ROUTES),
      },
      {
        path: PRIVATE_PATHS.providers,
        loadChildren: () =>
          import('@modules/providers/providers.routes').then((m) => m.PROVIDERS_ROUTES),
      },
      {
        path: `${PRIVATE_PATHS.providers}/${PRIVATE_PATHS.skills}`,
        loadChildren: () =>
          import('@modules/skills/skills.routes').then((m) => m.SKILLS_ROUTES),
      },
      {
        path: PRIVATE_PATHS.admin,
        canActivate: [adminGuard],
        loadChildren: () => import('@modules/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        path: PRIVATE_PATHS.director,
        canActivate: [directorGuard],
        loadChildren: () =>
          import('@modules/director/director.routes').then((m) => m.DIRECTOR_ROUTES),
      },
    ],
  },
  {
    path: AUTH_PATHS.root,
    loadComponent: () =>
      import('@shared/components/public-layout/public-layout.component').then(
        (m) => m.PublicLayout,
      ),
    children: [
      {
        path: '',
        loadChildren: () => import('@modules/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
