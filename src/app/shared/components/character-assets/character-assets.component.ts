import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { DropZoneComponent } from '@shared/components/drop-zone/drop-zone.component';
import { AssetsStateService } from '@app/core/stores/assets.state';
import { ReferenceAsset } from '@core/interfaces/studio.models';

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
  imports: [SectionHeaderComponent, DropZoneComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './character-assets.html',
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
