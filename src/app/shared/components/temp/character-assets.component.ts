import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/ui/section-header/section-header.component';
import { DropZoneComponent } from '../../shared/ui/drop-zone/drop-zone.component';
import { AssetsStateService } from '../../state/assets.state';
import { ReferenceAsset } from '../../core/models/studio.models';

/**
 * Section 05 — CHARACTER & ASSETS.
 *
 *   [▸ CHARACTER STUDIO]   Generate trusted reference images · powered by Seedream
 *   [▸ MY ASSETS]          Private trusted library · BytePlus
 *
 *   ─── REFERENCE ASSETS ────────────────────────────  N assets
 *   [FIRST FRAME drop zone]      [LAST FRAME drop zone]
 *   [+]   (extra free asset slot, generates Image N / Video N tags)
 *
 *   Reference them in your prompt as [Image 1] [Video 1] [Audio 1] …
 */
@Component({
  selector: 'app-character-assets',
  standalone: true,
  imports: [SectionHeaderComponent, DropZoneComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-6">
      <ui-section-header number="05" label="CHARACTER & ASSETS" />

      <!-- Character Studio accordion stub (green accent) -->
      <div
        class="mt-5 flex items-center justify-between border-l-2 bg-ink-850 px-4 py-3"
        style="border-color: var(--color-brand-green);"
      >
        <div class="flex items-center gap-3">
          <span style="color: var(--color-brand-green);">✦</span>
          <div>
            <p
              class="text-[12px] font-bold uppercase tracking-[0.18em]"
              style="color: var(--color-brand-green);"
            >
              CHARACTER STUDIO
            </p>
            <p class="text-[11px] italic text-fg-muted">
              Generate trusted reference images · powered by Seedream
            </p>
          </div>
        </div>
        <button type="button" class="text-fg-muted" aria-label="Expand">▾</button>
      </div>

      <!-- My Assets accordion stub (yellow accent) -->
      <div
        class="mt-3 flex items-center justify-between border-l-2 bg-ink-850 px-4 py-3"
        style="border-color: var(--color-brand-yellow);"
      >
        <div class="flex items-center gap-3">
          <span style="color: var(--color-brand-yellow);">◆</span>
          <div>
            <p
              class="text-[12px] font-bold uppercase tracking-[0.18em]"
              style="color: var(--color-brand-yellow);"
            >
              MY ASSETS
            </p>
            <p class="text-[11px] italic text-fg-muted">
              Private trusted library · BytePlus
            </p>
          </div>
        </div>
        <button type="button" class="text-fg-muted" aria-label="Expand">▾</button>
      </div>

      <!-- Reference assets block -->
      <div class="mt-5 border border-ink-600 bg-ink-900 p-4">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
            ▸ REFERENCE ASSETS
          </p>
          <p class="font-mono text-[11px] text-fg-muted">
            {{ assets.totalCount() }} assets
          </p>
        </div>

        <!-- First / Last frame -->
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ui-drop-zone
            label="FIRST FRAME"
            placeholder="DROP OR CLICK"
            (filesDropped)="onFirstFrame($event)"
          />
          <ui-drop-zone
            label="LAST FRAME"
            placeholder="DROP OR CLICK"
            (filesDropped)="onLastFrame($event)"
          />
        </div>

        <!-- Free asset slot -->
        <div class="mt-3">
          <ui-drop-zone
            placeholder=""
            [compact]="true"
            [multiple]="true"
            (filesDropped)="onFreeAssets($event)"
          />
        </div>

        <!-- Free asset thumbnail row + tag chips -->
        @if (assets.freeAssets().length) {
          <ul class="mt-3 flex flex-wrap gap-2">
            @for (a of assets.freeAssets(); track a.id) {
              <li
                class="inline-flex items-center gap-2 border border-ink-500 bg-ink-800 px-2 py-1 text-[11px] text-fg-strong"
              >
                <span
                  class="font-mono text-[10px]"
                  style="color: var(--color-brand-green);"
                >
                  {{ a.tag }}
                </span>
                <span class="text-fg-muted">{{ a.filename }}</span>
                <button
                  type="button"
                  class="text-fg-muted hover:text-brand-red"
                  (click)="assets.removeFreeAsset(a.id)"
                  aria-label="Remove asset"
                >×</button>
              </li>
            }
          </ul>
        }

        <p class="mt-3 text-[11px] italic text-fg-muted">
          Reference them in your prompt as
          <span
            class="mx-1 inline-block bg-ink-800 px-1.5 py-0.5 font-mono not-italic"
            style="color: var(--color-brand-green);"
          >Image 1</span>,
          <span
            class="mx-1 inline-block bg-ink-800 px-1.5 py-0.5 font-mono not-italic"
            style="color: var(--color-brand-green);"
          >Video 1</span>,
          <span
            class="mx-1 inline-block bg-ink-800 px-1.5 py-0.5 font-mono not-italic"
            style="color: var(--color-brand-green);"
          >Audio 1</span>
          … Click any tag below a thumbnail to insert it into the prompt.
        </p>
      </div>
    </section>
  `,
})
export class CharacterAssetsComponent {
  protected readonly assets = inject(AssetsStateService);

  protected onFirstFrame(files: File[]) {
    const f = files[0];
    if (!f) return;
    this.assets.setFirstFrame(this.toReferenceAsset(f, 'first-frame'));
  }

  protected onLastFrame(files: File[]) {
    const f = files[0];
    if (!f) return;
    this.assets.setLastFrame(this.toReferenceAsset(f, 'last-frame'));
  }

  protected onFreeAssets(files: File[]) {
    for (const f of files) {
      this.assets.addFreeAsset(this.toReferenceAsset(f, 'free'));
    }
  }

  private toReferenceAsset(
    file: File,
    slot: ReferenceAsset['slot'],
  ): ReferenceAsset {
    const kind: ReferenceAsset['kind'] = file.type.startsWith('video')
      ? 'video'
      : file.type.startsWith('audio')
        ? 'audio'
        : 'image';
    return {
      id: crypto.randomUUID(),
      kind,
      filename: file.name,
      thumbnailUrl: URL.createObjectURL(file),
      tag: '',          // overwritten by addFreeAsset
      slot,
    };
  }
}
