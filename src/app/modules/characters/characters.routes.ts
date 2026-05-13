import { Routes } from '@angular/router';

export const CHARACTERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import(
        '@modules/characters/characters/ui/index-characters/index-characters'
      ).then((m) => m.IndexCharacters),
  },
];
