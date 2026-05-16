import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./projects/ui/index-projects/index-projects').then((m) => m.IndexProjects),
  },
];
