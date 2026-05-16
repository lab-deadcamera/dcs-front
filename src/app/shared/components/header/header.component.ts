import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { ApiKeysPopoverComponent } from '@shared/components/api-keys-popover/api-keys-popover.component';
import { ThemePicker } from '@shared/components/theme-picker/theme-picker.component';
import { SessionStore } from '@app/core/stores/session.store';
import { StudioStore } from '@app/core/stores/studio.store';
import { ModelSelectDialogComponent } from '@shared/components/model-select-dialog/model-select-dialog.component';

@Component({
  selector: 'app-header',
  imports: [
    IconButtonComponent,
    ApiKeysPopoverComponent,
    ThemePicker,
    TranslatePipe,
    NgOptimizedImage,
    RouterLink,
    RouterLinkActive,
    ModelSelectDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex items-center justify-between gap-6 border-b border-ink-600 px-6 py-4">
      <div class="flex items-center gap-3">
        <img
          ngSrc="/assets/img/Facebook_Profile_Photo_196x196_Isotipo_Black.jpg"
          width="36"
          height="36"
          alt="Dead Camera Studios"
          class="rounded-sm object-cover"
          priority
        />

        <div class="leading-tight">
          <p class="text-[13px] font-bold uppercase tracking-[0.08em] text-fg-strong">
            {{ 'HEADER.BRAND.DEAD_CAMERA' | translate }}
            <span class="mx-1 text-primary-500">//</span>
            {{ 'HEADER.BRAND.SEEDANCE_STUDIO' | translate }}
          </p>
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-muted">
            {{ 'HEADER.SUBTITLE.STUDIOS' | translate }}
            <span class="mx-1 text-primary-500">//</span>
            {{ 'HEADER.SUBTITLE.AI_LAB' | translate }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <ui-icon-button
          icon="👤"
          [label]="session.user()?.handle ?? 'User'"
          iconColor="purple"
          labelColor="green"
        />
        <ui-icon-button
          icon="🎬"
          [label]="state.modelCode()?.name || ('HEADER.SELECT_MODEL' | translate)"
          iconColor="red"
          labelColor="red"
          (click)="onChangeModel()"
        />
        <app-theme-picker />
      </div>
    </header>

    <nav class="flex items-center gap-1 border-b border-ink-600 px-6" aria-label="Primary">
      <a
        routerLink="/studio"
        routerLinkActive="!text-fg-strong !border-primary-500"
        class="border-b-2 border-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
        data-testid="nav-studio"
      >
        {{ 'NAV.STUDIO' | translate }}
      </a>
      <a
        routerLink="/projects"
        routerLinkActive="!text-fg-strong !border-primary-500"
        class="border-b-2 border-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
        data-testid="nav-projects"
      >
        {{ 'NAV.PROJECTS' | translate }}
      </a>
      <a
        routerLink="/files"
        routerLinkActive="!text-fg-strong !border-primary-500"
        class="border-b-2 border-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
        data-testid="nav-files"
      >
        {{ 'NAV.FILES' | translate }}
      </a>
      <a
        routerLink="/providers"
        routerLinkActive="!text-fg-strong !border-primary-500"
        class="border-b-2 border-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
        data-testid="nav-providers"
      >
        {{ 'NAV.PROVIDERS' | translate }}
      </a>
    </nav>

    <app-model-select-dialog
      [visible]="modelDialogVisible()"
      (visibleChange)="modelDialogVisible.set($event)"
    />
  `,
})
export class HeaderComponent {
  protected readonly studio = inject(StudioStore);
  protected readonly session = inject(SessionStore);

  // Keep aliases for template compatibility
  protected readonly state = this.studio;

  protected readonly modelDialogVisible = signal(false);

  protected onChangeModel(): void {
    this.modelDialogVisible.set(true);
  }
}
