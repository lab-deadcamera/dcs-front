import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemePicker } from '@shared/components/theme-picker/theme-picker.component';

@Component({
  selector: 'app-private-layout',
  imports: [RouterOutlet, ThemePicker],
  template: `
    <div class="min-h-dvh flex flex-col bg-surface-0 dark:bg-surface-950 text-surface-900 dark:text-surface-100">
      <header class="flex items-center justify-between px-6 py-3 border-b border-surface-200 dark:border-surface-700">
        <h1 class="text-lg font-bold text-primary-600 dark:text-primary-400">dcs-videos</h1>
        <app-theme-picker />
      </header>

      <main class="flex-1 flex items-center justify-center p-6">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateLayout {}
