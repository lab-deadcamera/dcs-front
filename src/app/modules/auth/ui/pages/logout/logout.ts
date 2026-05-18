import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_PATHS } from '@app/core/constants';
import { SessionStore } from '@app/core/stores/session.store';

@Component({
  selector: 'app-logout',
  template: `<p class="p-4 text-center text-fg-muted">Logging out…</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LogoutComponent implements OnInit {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.session.logout();
    this.router.navigate([AUTH_PATHS.root, AUTH_PATHS.login]);
  }
}
