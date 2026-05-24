import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { ThemePicker } from '@shared/components/theme-picker/theme-picker.component';
import { SessionStore } from '@app/core/stores/session.store';
import { StudioStore } from '@app/core/stores/studio.store';
import { ModelSelectDialogComponent } from '@shared/components/model-select-dialog/model-select-dialog.component';
import { LEVEL_ROL, PRIVATE_PATHS } from '@app/core/constants';

const ROUTES = [
  {
    label: 'NAV.STUDIO',
    link: `/${PRIVATE_PATHS.studio}`,
    level: 100,
  },
  {
    label: 'NAV.PROJECTS',
    link: `/${PRIVATE_PATHS.projects}`,
    level: LEVEL_ROL.DIRECTOR,
  },
  {
    label: 'NAV.FILES',
    link: `/${PRIVATE_PATHS.files}`,
    level: 100,
  },
  {
    label: 'NAV.PROVIDERS',
    link: `/${PRIVATE_PATHS.providers}`,
    level: LEVEL_ROL.ADMIN,
  },
  {
    label: 'NAV.ADMIN',
    link: `/${PRIVATE_PATHS.admin}`,
    level: LEVEL_ROL.ADMIN,
  },
  {
    label: 'NAV.DIRECTOR',
    link: `/${PRIVATE_PATHS.director}`,
    level: LEVEL_ROL.DIRECTOR,
  },
];

@Component({
  selector: 'app-header',
  imports: [
    IconButtonComponent,
    ThemePicker,
    TranslatePipe,
    NgOptimizedImage,
    RouterLink,
    RouterLinkActive,
    ModelSelectDialogComponent,
  ],
  // Sticky header — pins the brand strip + primary nav to the top of the
  // viewport as the user scrolls. `bg-ink-950` matches the layout shell so
  // content underneath doesn't bleed through; `z-50` keeps it above the
  // studio's sticky right-rail and any dialog backdrops below modal-level.
  host: { class: 'sticky top-0 z-50 bg-ink-950' },
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected readonly studio = inject(StudioStore);
  protected readonly session = inject(SessionStore);

  // Keep aliases for template compatibility
  protected readonly state = this.studio;

  protected readonly modelDialogVisible = signal(false);

  /** Largest edge (px) of the stored avatar — kept small for the session snapshot. */
  private readonly AVATAR_SIZE = 96;

  protected onChangeModel(): void {
    this.modelDialogVisible.set(true);
  }

  public readonly ROUTES = ROUTES;

  /**
   * Read the picked image, center-crop + downscale it to a square 96×96
   * PNG data URL via a canvas, and persist it on the session. Keeping it
   * tiny avoids bloating the IndexedDB-backed session snapshot.
   */
  protected onAvatarPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = this.AVATAR_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Cover-fit: scale so the shorter edge fills the square, center the rest.
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        this.session.setAvatar(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
}
