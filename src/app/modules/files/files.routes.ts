import { Routes } from '@angular/router';

export const FILES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@modules/files/files/ui/index-files/index-files').then(
        (m) => m.IndexFiles,
      ),
  },
];
