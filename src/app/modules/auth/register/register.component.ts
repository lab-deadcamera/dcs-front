import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-register',
  template: `
    <div class="text-center">
      <h2 class="text-2xl font-semibold mb-2">Register</h2>
      <p class="text-surface-500 dark:text-surface-400">Create a new account</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {}
