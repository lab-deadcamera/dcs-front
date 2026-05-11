import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { ThemePicker } from '@shared/components/theme-picker/theme-picker.component';
import { StudioStateService } from '@app/core/stores/studio.state';

/**
 * Top navigation bar.
 *
 *  [logo] DEAD CAMERA / SEEDANCE STUDIO    • ADD API KEY → [jander] [SR·20] [EXPORT 0] [API no key]
 *         STUDIOS / AI RESEARCH LAB
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IconButtonComponent, ThemePicker, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="flex items-center justify-between gap-6 border-b border-ink-600 px-6 py-4"
    >
      <!-- Brand block -->
      <div class="flex items-center gap-3">
        <!-- Logo glyph: square frame w/ inner ring -->
        <svg viewBox="0 0 32 32" class="h-9 w-9" aria-hidden="true">
          <rect
            x="1.5" y="1.5" width="29" height="29" rx="2"
            fill="none"
            stroke="var(--color-fg-strong)"
            stroke-width="1.5"
          />
          <circle
            cx="16" cy="16" r="6"
            fill="none"
            stroke="var(--color-fg-strong)"
            stroke-width="1.5"
          />
          <circle cx="16" cy="16" r="2" fill="var(--color-fg-strong)" />
        </svg>

        <div class="leading-tight">
          <p class="text-[13px] font-bold uppercase tracking-[0.08em] text-fg-strong">
            {{ 'HEADER.BRAND.DEAD_CAMERA' | translate }}
            <span class="mx-1 text-brand-red">//</span>
            {{ 'HEADER.BRAND.SEEDANCE_STUDIO' | translate }}
          </p>
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-muted">
            {{ 'HEADER.SUBTITLE.STUDIOS' | translate }}
            <span class="mx-1 text-brand-red">//</span>
            {{ 'HEADER.SUBTITLE.AI_LAB' | translate }}
          </p>
        </div>
      </div>

      <!-- Right cluster -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-strong"
        >
          <span class="inline-block h-2 w-2 rounded-full bg-brand-red"></span>
          {{ 'HEADER.ACTIONS.ADD_API_KEY' | translate }} <span aria-hidden="true">→</span>
        </button>

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
          [badge]="state.apiBadge()"
          badgeColor="red"
        />

        <app-theme-picker />
      </div>
    </header>
  `,
})
export class HeaderComponent {
  protected readonly state = inject(StudioStateService);
}
