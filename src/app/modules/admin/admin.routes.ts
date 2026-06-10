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
    ],
  },
];
