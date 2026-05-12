import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { ApiKeysPopoverComponent } from '@shared/components/api-keys-popover/api-keys-popover.component';
import { ThemePicker } from '@shared/components/theme-picker/theme-picker.component';
import { StudioStateService } from '@app/core/stores/studio.state';

/**
 * Top navigation bar.
 *
 *  [logo] DEAD CAMERA / SEEDANCE STUDIO    • [API KEYS popover] [jander] [SR·20] [EXPORT 0] [API status]
 *         STUDIOS / AI RESEARCH LAB
 */
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="flex items-center justify-between gap-6 border-b border-ink-600 px-6 py-4"
    >
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
        <app-api-keys-popover />

        <ui-icon-button
          icon="👤"
          [label]="state.user().handle"
          iconColor="purple"
          labelColor="green"
        />
        <ui-icon-button
          icon="🎬"
          [label]="state.projectCode()"
          iconColor="red"
          labelColor="red"
        />
        <ui-icon-button
          icon="📦"
          [label]="'HEADER.ACTIONS.EXPORT' | translate"
          [badge]="state.exportCount().toString()"
          iconColor="green"
          badgeColor="green"
        />
        <ui-icon-button
          icon="🖥"
          [label]="'HEADER.ACTIONS.API' | translate"
          [badge]="state.apiBadge() | translate"
          badgeColor="red"
        />

        <app-theme-picker />
      </div>
    </header>

    <!--
      Route navigator — switch between the Studio and the Characters
      library. Active tab is underlined and tinted with the primary
      palette so it follows the global theme.
    -->
    <nav
      class="flex items-center gap-1 border-b border-ink-600 px-6"
      aria-label="Primary"
    >
      <a
        routerLink="/studio"
        routerLinkActive="!text-fg-strong !border-primary-500"
        class="border-b-2 border-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
        data-testid="nav-studio"
      >
        {{ 'NAV.STUDIO' | translate }}
      </a>
      <a
        routerLink="/characters"
        routerLinkActive="!text-fg-strong !border-primary-500"
        class="border-b-2 border-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
        data-testid="nav-characters"
      >
        {{ 'NAV.CHARACTERS' | translate }}
      </a>
      <a
        routerLink="/files"
        routerLinkActive="!text-fg-strong !border-primary-500"
        class="border-b-2 border-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
        data-testid="nav-files"
      >
        {{ 'NAV.FILES' | translate }}
      </a>
    </nav>
  `,
})
export class HeaderComponent {
  protected readonly state = inject(StudioStateService);
}
