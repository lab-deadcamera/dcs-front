import { Component, inject, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Popover } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionStore } from '@app/core/stores/session.store';
import { LanguagePicker } from '@shared/components/language-picker/language-picker.component';
import { AUTH_PATHS } from '@app/core/constants';

@Component({
  selector: 'app-theme-picker',
  imports: [Popover, ButtonModule, TranslatePipe, LanguagePicker],
  templateUrl: './theme-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemePicker {
  private readonly router = inject(Router);
  protected readonly session = inject(SessionStore);

  // Template compatibility alias
  protected readonly theme = this.session;

  @ViewChild('popover') protected readonly popover!: Popover;

  protected logout(): void {
    this.router.navigate([AUTH_PATHS.root, AUTH_PATHS.logout]);
  }
}
