import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-home',
  template: `
    <div class="text-center">
      <h2 class="text-2xl font-semibold mb-2">Welcome</h2>
      <p class="text-surface-500 dark:text-surface-400">Select a video to get started</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
