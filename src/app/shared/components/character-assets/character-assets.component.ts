import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { DropZoneComponent } from '@shared/components/drop-zone/drop-zone.component';
import { AssetsStateService } from '@app/core/stores/assets.state';
import { ReferenceAsset } from '@core/interfaces/studio.models';
import { IndexCharacters } from '@modules/characters/characters/ui/index-characters/index-characters';
import { FilesApiService } from '@app/services';
import { inferKind } from '@app/shared/utils';

/**
 * Section 05 — CHARACTER & ASSETS.
 *
 *   [▸ CHARACTER STUDIO]   Generate trusted reference images · powered by Seedream
 *   [▸ MY ASSETS]          Private trusted library · BytePlus
 *
 *   ─── REFERENCE ASSETS ────────────────────────────  N assets
 *   [FIRST FRAME drop zone]      [LAST FRAME drop zone]
 *   [+]   (extra free asset slot, generates Image N / Video N tags)
 */
@Component({
  selector: 'app-character-assets',
  imports: [
    SectionHeaderComponent,
    DropZoneComponent,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    IndexCharacters,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './character-assets.html',
  providers: [MessageService],
})
export class CharacterAssetsComponent {
  private readonly filesApi = inject(FilesApiService);
  private readonly toast = inject(MessageService);
  protected readonly assets = inject(AssetsStateService);

  /**
   * Whether the "My Assets" band acts as an open disclosure — its body
   * (the Reference Assets panel: First/Last frame + free assets grid) is
   * mounted only when expanded. Defaults to open so first-time visitors
   * still see the asset drop-zones without an extra click.
   */
  protected readonly myAssetsExpanded = signal(true);

  /**
   * Whether the embedded Characters library dialog is open. Launched from
   * the "CREATE ASSETS" button inside the My Assets panel — provides the
   * full character CRUD inline so the user never has to leave the studio.
   */
  protected readonly charactersDialogVisible = signal(false);

  protected toggleMyAssets(): void {
    this.myAssetsExpanded.update((v) => !v);
  }

  protected openCharactersLibrary(): void {
    this.charactersDialogVisible.set(true);
  }

  protected onCharactersDialogVisibility(v: boolean): void {
    this.charactersDialogVisible.set(v);
  }

  protected onFirstFrame(files: File[]) {
    const f = files[0];
    if (!f) return;
    this.filesApi.upload({ file: f, category: 'images', storage: 'temp' }).subscribe((up) => {
      if (up.error || !up.data) {
        this.toast.add({ severity: 'error', summary: 'Upload error', detail: up.msg });
        return;
      }
      this.assets.setFirstFrame({
        id: up.data.id,
        kind: inferKind(f),
        filename: up.data.filename,
        thumbnailUrl: this.filesApi.serveUrl(up.data.id),
        tag: '',
        slot: 'first-frame',
      });
    });
  }

  protected onLastFrame(files: File[]) {
    const f = files[0];
    if (!f) return;
    this.filesApi.upload({ file: f, category: 'images', storage: 'temp' }).subscribe((up) => {
      if (up.error || !up.data) {
        this.toast.add({ severity: 'error', summary: 'Upload error', detail: up.msg });
        return;
      }
      this.assets.setLastFrame({
        id: up.data.id,
        kind: inferKind(f),
        filename: up.data.filename,
        thumbnailUrl: this.filesApi.serveUrl(up.data.id),
        tag: '',
        slot: 'last-frame',
      });
    });
  }

  protected onFreeAssets(files: File[]) {
    for (const f of files) {
      this.filesApi.upload({ file: f, category: 'images', storage: 'temp' }).subscribe((up) => {
        if (up.error || !up.data) {
          this.toast.add({ severity: 'error', summary: 'Upload error', detail: up.msg });
          return;
        }
        this.assets.addFreeAsset({
          id: up.data.id,
          kind: inferKind(f),
          filename: up.data.filename,
          thumbnailUrl: this.filesApi.serveUrl(up.data.id),
          tag: '',
          slot: 'free',
        });
      });
    }
  }
}
