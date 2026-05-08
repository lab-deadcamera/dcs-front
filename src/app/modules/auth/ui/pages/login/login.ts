import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-login',
  template: `
    <div class="text-center">
      <h2 class="text-2xl font-semibold mb-2">Login</h2>
      <p class="text-surface-500 dark:text-surface-400">Sign in to your account</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginComponent { }
