import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen flex-col">
      <nav class="flex items-center gap-1 border-b border-ink-600 px-6" aria-label="Admin">
        <a
          routerLink="/admin/logs"
          routerLinkActive="!text-fg-strong !border-primary-500"
          class="border-b-2 border-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
        >
          Generation Logs
        </a>
        <a
          routerLink="/admin/users"
          routerLinkActive="!text-fg-strong !border-primary-500"
          class="border-b-2 border-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
        >
          Users
        </a>
      </nav>
      <div class="flex-1">
        <router-outlet />
      </div>
    </div>
  `,
})
export class AdminLayoutComponent {}
