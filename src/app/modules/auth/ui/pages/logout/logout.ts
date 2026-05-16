import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { SessionStore } from '@app/core/stores/session.store';

@Component({
  selector: 'app-logout',
  template: `<p class="p-4 text-center text-fg-muted">Logging out…</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LogoutComponent implements OnInit {
  private readonly session = inject(SessionStore);

  ngOnInit(): void {
    this.session.logout();
  }
}
