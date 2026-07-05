import { Routes } from '@angular/router';

export const SKILLS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./skills/ui/index-skills/index-skills.component').then((m) => m.IndexSkillsComponent),
  },
];
