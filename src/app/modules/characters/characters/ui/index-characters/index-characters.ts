import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

import { CharactersService } from '../../services';
import {
  AssetType,
  Character,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../../interfaces';
import { CharacterFormDialogComponent } from '../components/character-form-dialog/character-form-dialog.component';
import { CharacterFilesDialogComponent } from '../components/character-files-dialog/character-files-dialog.component';
import { AssetCreateDialogComponent } from '../components/asset-create-dialog/asset-create-dialog.component';

/**
 * Characters library — typed asset board.
 *
 * The library is split into three buckets driven by `metadata.assetType`:
 * CHARACTER · LOCATION · PROP. The top row exposes one "New …" button
 * per type which opens the shared `<app-asset-create-dialog>` wizard
 * (name + description + drag-drop multi-file upload). The tab strip
 * below filters the grid to the currently-active bucket.
 *
 * Existing edit / delete / file-manage flows still go through the
 * single-row `CharacterFormDialogComponent` and `CharacterFilesDialogComponent`.
 */
@Component({
  selector: 'app-index-characters',
  imports: [
    DatePipe,
    TranslatePipe,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    CharacterFormDialogComponent,
    CharacterFilesDialogComponent,
    AssetCreateDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  templateUrl: './index-characters.html',
  styleUrl: './index-characters.css',
})
export class IndexCharacters implements OnInit {
  protected readonly characters = inject(CharactersService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  /** Which bucket is currently shown in the grid. */
  protected readonly activeType = signal<AssetType>('character');

  protected readonly tabs: {
    id: AssetType;
    labelKey: string;
    icon: string;
  }[] = [
    { id: 'character', labelKey: 'CHARACTERS.TABS.CHARACTER', icon: 'pi pi-user'  },
    { id: 'location',  labelKey: 'CHARACTERS.TABS.LOCATION',  icon: 'pi pi-map'   },
    { id: 'prop',      labelKey: 'CHARACTERS.TABS.PROP',      icon: 'pi pi-box'   },
  ];

  protected readonly visibleAssets = computed<Character[]>(
    () => this.characters.itemsByType()[this.activeType()] ?? [],
  );

  // Edit dialog (name / description) — reused for any type.
  protected readonly editDialogVisible = signal(false);
  protected readonly editDialogTarget = signal<Character | null>(null);
  protected readonly submitting = signal(false);

  // File manager dialog (per asset).
  protected readonly filesDialogVisible = signal(false);
  protected readonly filesDialogTarget = signal<Character | null>(null);

  // Create wizard.
  protected readonly createDialogVisible = signal(false);
  protected readonly createDialogType = signal<AssetType>('character');

  ngOnInit(): void {
    this.characters.load().subscribe();
  }

  protected setActiveType(t: AssetType): void {
    this.activeType.set(t);
  }

  protected openCreate(type: AssetType): void {
    this.activeType.set(type);
    this.createDialogType.set(type);
    this.createDialogVisible.set(true);
  }

  protected onAssetCreated(_evt: { id: string; type: AssetType }): void {
    // Refresh the list so the new asset is visible in its tab.
    this.characters.load().subscribe();
  }

  protected openEdit(asset: Character): void {
    this.editDialogTarget.set(asset);
    this.editDialogVisible.set(true);
  }

  protected openFiles(asset: Character): void {
    this.filesDialogTarget.set(asset);
    this.filesDialogVisible.set(true);
  }

  protected onUpdate(evt: { id: string; patch: UpdateCharacterRequest }): void {
    if (Object.keys(evt.patch).length === 0) {
      this.editDialogVisible.set(false);
      return;
    }
    this.submitting.set(true);
    this.characters.update(evt.id, evt.patch).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Updated' });
      this.editDialogVisible.set(false);
    });
  }

  /**
   * The shared form dialog still emits a `create` event for legacy use,
   * but the typed create flow now goes through `AssetCreateDialogComponent`.
   * Forward to it so behaviour stays correct if edit-dialog is opened
   * without a target.
   */
  protected onCreateLegacy(payload: CreateCharacterRequest): void {
    this.submitting.set(true);
    this.characters.create(payload).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Created' });
      this.editDialogVisible.set(false);
    });
  }

  protected confirmDelete(asset: Character): void {
    this.confirm.confirm({
      header: 'Delete asset',
      message: `Delete "${asset.name}"? This is a soft delete.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.characters.delete(asset.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Deleted' });
        }),
    });
  }

  protected metadataPreview(c: Character): string {
    const entries = Object.entries(c.metadata).filter(([k]) => k !== 'assetType');
    if (entries.length === 0) return '—';
    return entries
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' · ');
  }
}
