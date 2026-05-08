import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet],
  template: `
    <div class="min-h-dvh flex flex-col bg-surface-0 dark:bg-surface-950 text-surface-900 dark:text-surface-100">
      <main class="flex-1 flex items-center justify-center p-6">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicLayout {}
