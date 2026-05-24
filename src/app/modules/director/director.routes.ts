import { Routes } from '@angular/router';
import { DirectorLayoutComponent } from '@shared/components/director-layout/director-layout.component';

export const DIRECTOR_ROUTES: Routes = [
  {
    path: '',
    component: DirectorLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'projects',
        pathMatch: 'full',
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('@modules/projects/projects.routes').then((m) => m.PROJECTS_ROUTES),
      },
      {
        path: 'scenes/:sceneId/assign',
        loadComponent: () =>
          import('./director/ui/scene-assignment/scene-assignment').then(
            (m) => m.SceneAssignmentComponent,
          ),
      },
    ],
  },
];
