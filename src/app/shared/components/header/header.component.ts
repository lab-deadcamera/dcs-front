import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { ThemePicker } from '@shared/components/theme-picker/theme-picker.component';
import { SessionStore } from '@app/core/stores/session.store';
import { StudioStore } from '@app/core/stores/studio.store';
import { ModelSelectDialogComponent } from '@shared/components/model-select-dialog/model-select-dialog.component';

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
            {{ 'HEADER.SUBTITLE.AI_LAB' | translate }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!--
          User chip doubles as the avatar editor: click anywhere on it to
          pick an image, which is downscaled to a 96×96 data URL and stored
          in the session. Shows the photo when set, the 👤 glyph otherwise.
        -->
        <button
          type="button"
          class="inline-flex items-center gap-2 border border-ink-500 bg-ink-850 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-fg-strong transition-colors hover:border-fg-muted focus:outline-none focus:border-fg-muted"
          (click)="avatarInput.click()"
          [attr.aria-label]="'HEADER.EDIT_AVATAR' | translate"
          [title]="'HEADER.EDIT_AVATAR' | translate"
          data-testid="header-user-avatar"
        >
          @if (session.avatarUrl(); as url) {
            <img [src]="url" alt="" class="h-5 w-5 rounded-full object-cover" />
          } @else {
            <span class="text-sm text-[color:var(--color-brand-purple)]">👤</span>
          }
          <span class="text-secondary-500">{{ session.user()?.handle ?? 'User' }}</span>
        </button>
        <input
          #avatarInput
          type="file"
          accept="image/*"
          class="hidden"
          (change)="onAvatarPick($event)"
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
      @if (session.roleLevel() <= 1) {
        <a
          routerLink="/admin"
          routerLinkActive="!text-fg-strong !border-primary-500"
          class="border-b-2 border-transparent px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-fg-strong"
          data-testid="nav-admin"
        >
          {{ 'NAV.ADMIN' | translate }}
        </a>
      }
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

  /** Largest edge (px) of the stored avatar — kept small for the session snapshot. */
  private static readonly AVATAR_SIZE = 96;

  protected onChangeModel(): void {
    this.modelDialogVisible.set(true);
  }

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
        const size = HeaderComponent.AVATAR_SIZE;
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
