import { Routes } from '@angular/router';
import { AdminLayoutComponent } from '@shared/components/admin-layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'logs',
        pathMatch: 'full',
      },
      {
        path: 'logs',
        loadComponent: () =>
          import('./admin/ui/index-admin/index-admin').then((m) => m.IndexAdmin),
      },
      {
        path: 'shot-builder-logs',
        loadComponent: () =>
          import('./admin/ui/shot-builder-logs/shot-builder-logs.component').then(
            (m) => m.ShotBuilderLogsComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./admin/ui/user-management/user-management.component').then(
            (m) => m.UserManagementComponent,
          ),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./admin/ui/admin-project-management/admin-project-management.component').then(
            (m) => m.AdminProjectManagementComponent,
          ),
      },
      {
        path: 'external-galleries',
        loadComponent: () =>
          import('./admin/ui/external-galleries/external-galleries.component').then(
            (m) => m.ExternalGalleriesComponent,
          ),
      },
    ],
  },
];
