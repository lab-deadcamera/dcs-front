import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@shared/components/header/header.component';

@Component({
  selector: 'app-private-layout',
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <div class="min-h-dvh flex flex-col bg-surface-0 dark:bg-surface-950 text-surface-900 dark:text-surface-100">
      <app-header />

      <main class="flex-1 flex items-center justify-center p-6">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateLayout {}
