import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Popover } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { StudioStore } from '@app/core/stores/studio.store';
import { FilesApiService } from '@app/services/files-api.service';
import { ProjectsApiService } from '@app/modules/projects/projects/services/projects-api.service';
import { FileCategory } from '@app/core/interfaces';
import { Reference, ReferenceType } from '@app/core/interfaces';
import { SourceAssetPipe } from '@app/core/pipes';
import { inferKind } from '@app/shared/utils';

/**
 * Embebido en el shot-sequence-viewer dentro de la sección "Referencias [Image]".
 * Detecta las referencias que NO tienen un asset/character relacionado en el
 * episodio (por assetId o por slot [ImageN]) y las resalta. Para cada una
 * permite asignar un free asset del episodio (o subir uno nuevo), que toma el
 * slot de la referencia.
 */
@Component({
  selector: 'app-shot-reference-resolver',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    Popover,
    ButtonModule,
    TooltipModule,
    SourceAssetPipe,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ref-resolver">
      <!-- Header + unresolved badge -->
      <div class="ref-header">
        <span class="section-tag ref-title">Referencias [Image]</span>
        @if (unresolved().length > 0) {
          <span class="ref-badge" [attr.title]="unresolved().length + ' sin resolver'">
            {{ unresolved().length }} sin resolver
          </span>
        }
      </div>

      <div class="refs-summary">
        @for (ref of references(); track ref.slot) {
          @if (isUnresolvedRef(ref)) {
            <!-- Unresolved → highlighted chip + assign button -->
            <span class="ref-chip ref-chip-unresolved">
              <em>{{ ref.slot }}</em>
              <span class="ref-name">{{ refNameFor(ref) }}</span>
              <span class="ref-type">{{ refTypeLabel(ref.type) }}</span>
              <button
                type="button"
                class="ref-assign-btn"
                (click)="openAssignPopover($event, ref)"
                [pTooltip]="'STUDIO.SHOT_BUILDER.ASSIGN_FREE_ASSET' | translate"
                tooltipPosition="top"
              >
                <i class="pi pi-plus" aria-hidden="true"></i>
              </button>
            </span>
          } @else {
            <!-- Resolved → normal chip -->
            <span class="ref-chip ref-chip-ok">
              <em>{{ ref.slot }}</em>
              <span class="ref-name">{{ refNameFor(ref) }}</span>
              <span class="ref-type">{{ refTypeLabel(ref.type) }}</span>
            </span>
          }
        }
        @if (references().length === 0) {
          <span class="ref-empty">{{ 'STUDIO.SEQUENCE.NO_REFS' | translate }}</span>
        }
      </div>

      <!-- Assign popover -->
      <p-popover #assignPopover [dismissable]="true">
        @if (assignTarget(); as target) {
          <div class="ref-assign-popover">
            <p class="ref-popover-title">
              Asignar asset al slot <b>{{ target.slot }}</b>
            </p>

            <!-- Episode free assets -->
            @if (sortedFreeAssets().length > 0) {
              <div class="ref-asset-grid">
                @for (a of sortedFreeAssets(); track a.id) {
                  <button
                    type="button"
                    class="ref-asset-tile"
                    [class.ref-asset-active]="chapterAssetSlots().get(a.id) === target.slot"
                    [class.ref-asset-broken]="isThumbBroken(a.id)"
                    (click)="assignFile(a.id, target.slot)"
                    [title]="chapterAssetSlotLabel(a.id, a.filename)"
                  >
                    @if (a.kind === 'image' && !isThumbBroken(a.id)) {
                      <img
                        [src]="a.id | sourceAsset"
                        [alt]="a.filename"
                        class="ref-asset-img"
                        loading="lazy"
                        (error)="onThumbError(a.id)"
                      />
                    } @else {
                      <div class="ref-asset-placeholder">
                        <i
                          class="pi"
                          [class.pi-image]="a.kind === 'image'"
                          [class.pi-video]="a.kind === 'video'"
                          [class.pi-volume-up]="a.kind === 'audio'"
                          aria-hidden="true"
                        ></i>
                      </div>
                    }
                    <span class="ref-asset-slot">{{ chapterAssetSlots().get(a.id) || 'sin slot' }}</span>
                  </button>
                }
              </div>
            } @else {
              <p class="ref-popover-empty">{{ 'STUDIO.SEQUENCE.NO_FREE_ASSETS' | translate }}</p>
            }

            <!-- Upload new -->
            <div class="ref-upload">
              <input
                #uploadInput
                type="file"
                class="hidden"
                accept="image/*,video/*,audio/*"
                [multiple]="true"
                (change)="onUploadSelected($event, target.slot)"
              />
              <p-button
                [label]="'STUDIO.SHOT_BUILDER.UPLOAD_FREE_ASSET' | translate"
                severity="secondary"
                [outlined]="true"
                size="small"
                icon="pi pi-upload"
                [disabled]="uploading()"
                [loading]="uploading()"
                (onClick)="uploadInput.click()"
              />
            </div>
          </div>
        }
      </p-popover>
    </div>
  `,
  styles: [
    `
      .ref-resolver {
        margin-bottom: 14px;
      }
      .ref-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      .ref-title {
        margin: 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
      }
      .ref-badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #e0653c;
        border: 1px solid rgba(224, 101, 60, 0.5);
        border-radius: 100px;
        padding: 2px 10px;
        white-space: nowrap;
      }
      .refs-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .ref-chip {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--ink, #ece6d8);
        background: var(--bg2, #0f1a1c);
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        padding: 3px 9px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .ref-chip em {
        color: var(--amber, #e0a95c);
        font-style: normal;
        font-weight: 700;
      }
      .ref-chip-ok {
        opacity: 0.85;
      }
      .ref-chip-unresolved {
        border-color: rgba(224, 101, 60, 0.75);
        background: rgba(224, 101, 60, 0.08);
      }
      .ref-name {
        color: var(--ink-dim, #9aa6a3);
      }
      .ref-chip-unresolved .ref-name {
        color: #e0653c;
      }
      .ref-type {
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
      }
      .ref-assign-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border: 1px solid rgba(224, 101, 60, 0.6);
        border-radius: 50%;
        background: transparent;
        color: #e0653c;
        cursor: pointer;
        font-size: 10px;
        padding: 0;
        transition: all 0.15s ease;
      }
      .ref-assign-btn:hover {
        background: #e0653c;
        color: #0c1315;
      }
      .ref-empty {
        font-size: 12px;
        color: var(--ink-faint, #6a7977);
        font-style: italic;
      }

      /* Popover content */
      .ref-assign-popover {
        width: 320px;
        padding: 14px;
        background: var(--panel, #121f21);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .ref-popover-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: var(--ink-dim, #9aa6a3);
        margin: 0;
      }
      .ref-popover-title b {
        color: var(--amber, #e0a95c);
        font-weight: 700;
      }
      .ref-asset-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
        gap: 8px;
      }
      .ref-asset-tile {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        overflow: hidden;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        background: var(--bg2, #0f1a1c);
        cursor: pointer;
        padding: 0;
        transition: border-color 0.15s ease;
      }
      .ref-asset-tile:hover {
        border-color: var(--teal, #4fb0b5);
      }
      .ref-asset-tile.ref-asset-active {
        border-color: #5fb98f;
        box-shadow: 0 0 0 1px #5fb98f;
      }
      .ref-asset-tile.ref-asset-broken {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ref-asset-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ref-asset-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ink-faint, #6a7977);
        font-size: 14px;
      }
      .ref-asset-slot {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 8px;
        letter-spacing: 0.04em;
        text-align: center;
        color: var(--ink-dim, #9aa6a3);
        background: rgba(12, 19, 21, 0.75);
        padding: 1px 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ref-popover-empty {
        font-size: 12px;
        color: var(--ink-faint, #6a7977);
        font-style: italic;
        margin: 0;
      }
      .ref-upload {
        border-top: 1px solid var(--line, #1e3133);
        padding-top: 10px;
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
})
export class ShotReferenceResolverComponent {
  readonly references = input<Reference[]>([]);
  readonly unresolved = input<Reference[]>([]);
  readonly projectId = input<string>('');
  readonly chapterId = input<string>('');

  /** Emitted when the set of slots this resolver has assigned changes — the
   *  viewer uses it to exclude those references from the create-pre-prompts
   *  validation. */
  readonly assignedSlotsChange = output<Set<string>>();

  protected readonly studio = inject(StudioStore);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly filesApi = inject(FilesApiService);
  private readonly toast = inject(MessageService);

  @ViewChild('assignPopover') protected readonly assignPopover!: Popover;

  /** Reference currently being assigned (the popover target). */
  protected readonly assignTarget = signal<Reference | null>(null);
  protected readonly uploading = signal(false);

  /** Slots the user has assigned a free asset to — a reference whose assetId
   *  still doesn't match is considered resolved once its slot is in here. */
  protected readonly assignedSlots = signal<Set<string>>(new Set());

  /** IDs of thumbnails that failed to load. */
  private readonly brokenThumbs = signal<Set<string>>(new Set());

  /** Human-readable name per assetId — matches by id, file id, name and
   *  filename (case-insensitive), since the backend may reference free assets
   *  by name ("name_of_asset") rather than by id. */
  protected readonly refNames = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    const add = (key: string | undefined, name: string): void => {
      const k = key?.trim().toLowerCase();
      if (k) map[k] = name;
    };
    for (const c of this.studio.chapterCharacterData()) {
      add(c.id, c.name);
      add(c.fileId, c.name);
      add(c.name, c.name);
    }
    for (const a of this.studio.freeAssets()) {
      add(a.id, a.filename);
      add(a.filename, a.filename);
    }
    return map;
  });

  /** Episode free assets ordered by their [ImageN] slot (slot-less last). */
  protected readonly sortedFreeAssets = computed(() => {
    const slotOf = (id: string) => slotNum(this.studio.chapterAssetSlots().get(id) ?? '');
    return [...this.studio.freeAssets()].sort((a, b) => slotOf(a.id) - slotOf(b.id));
  });

  protected readonly chapterAssetSlots = computed(() => this.studio.chapterAssetSlots());

  /** Normalized lookup key for an assetId (trimmed, lowercased). */
  private refKey(assetId: string | undefined): string {
    return assetId ? assetId.trim().toLowerCase() : '';
  }

  /** Display name for a reference, resolved case-insensitively by id, file id,
   *  name or filename; falls back to the raw assetId. */
  protected refNameFor(ref: Reference): string {
    return this.refNames()[this.refKey(ref.assetId)] || ref.assetId;
  }

  /** A reference from the `unresolved` input is only still "unresolved" until
   *  the user assigns a free asset to its slot — assignedSlots then excludes it. */
  protected isUnresolvedRef(ref: Reference): boolean {
    if (this.assignedSlots().has(ref.slot)) return false;
    return this.unresolved().some((u) => u.slot === ref.slot);
  }

  /** Record a successful assignment and notify the viewer so the reference
   *  stops being considered unresolved (validation + highlight). */
  private markAssigned(slot: string): void {
    this.assignedSlots.update((s) => {
      const next = new Set(s);
      next.add(slot);
      return next;
    });
    this.assignedSlotsChange.emit(this.assignedSlots());
  }

  protected refTypeLabel(type: ReferenceType): string {
    switch (type) {
      case 'character':
        return 'personaje';
      case 'location':
        return 'locación';
      case 'prop':
        return 'objeto';
      case 'audio':
        return 'audio';
      case 'plate':
        return 'plate';
      default:
        return type;
    }
  }

  protected chapterAssetSlotLabel(id: string, filename: string): string {
    return this.studio.chapterAssetSlots().get(id) || filename;
  }

  protected isThumbBroken(id: string): boolean {
    return this.brokenThumbs().has(id);
  }

  protected onThumbError(id: string): void {
    this.brokenThumbs.update((s) => {
      const next = new Set(s);
      next.add(id);
      return next;
    });
  }

  protected openAssignPopover(event: Event, ref: Reference): void {
    this.assignTarget.set(ref);
    this.assignPopover.toggle(event);
  }

  /**
   * Assign an episode free asset to a reference slot. If the asset is already
   * assigned with a DIFFERENT slot, re-assign it (remove by assignmentId, then
   * assign with the reference's slot). Afterward, reload chapter assignments so
   * the store's refNames/slots update and the chip stops highlighting.
   */
  protected assignFile(fileId: string, slot: string): void {
    const projectId = this.projectId() || this.studio.projectId() || '';
    const chapterId = this.chapterId() || this.studio.chapterId() || '';
    if (!projectId || !chapterId) return;

    const currentSlot = this.studio.chapterAssetSlots().get(fileId);
    if (currentSlot === slot) {
      this.toast.add({
        severity: 'info',
        summary: 'Ya asignado',
        detail: `El asset ya tiene el slot ${slot}.`,
      });
      this.assignPopover.hide();
      return;
    }

    const assignmentId = this.studio.chapterAssetAssignmentIds().get(fileId);

    // Reassign: remove the old assignment (by its row id) when it has a slot.
    const assign = (): void => {
      this.projectsApi
        .assignAssetToChapter(projectId, chapterId, fileId, slot)
        .subscribe({
          next: (res) => {
            if (res?.data?.id) {
              this.studio.registerChapterAssetAssignment(fileId, res.data.id);
            }
            this.markAssigned(slot);
            this.refreshAssignments(projectId, chapterId);
            this.assignPopover.hide();
            this.toast.add({
              severity: 'success',
              summary: 'Asset asignado',
              detail: `${fileId} → ${slot}`,
            });
          },
          error: () => {
            this.toast.add({
              severity: 'error',
              summary: 'Asignación fallida',
              detail: `No se pudo asignar el asset al slot ${slot}.`,
            });
          },
        });
    };

    if (assignmentId && currentSlot) {
      this.projectsApi.removeAssetFromChapter(projectId, chapterId, assignmentId).subscribe({
        next: () => assign(),
        error: () => assign(),
      });
    } else {
      assign();
    }
  }

  /** Upload new free assets and assign each to the reference slot. */
  protected onUploadSelected(event: Event, slot: string): void {
    const target = event.target as HTMLInputElement | null;
    const files = target?.files ? Array.from(target.files) : [];
    if (files.length === 0) return;

    const projectId = this.projectId() || this.studio.projectId() || '';
    const chapterId = this.chapterId() || this.studio.chapterId() || '';

    let pending = files.length;
    this.uploading.set(true);

    const done = (): void => {
      pending -= 1;
      if (pending <= 0) {
        this.uploading.set(false);
        if (target) target.value = '';
      }
    };

    for (const f of files) {
      let category: FileCategory;
      if (f.type.startsWith('image/')) {
        category = 'images';
      } else if (f.type.startsWith('video/')) {
        category = 'videos';
      } else if (f.type.startsWith('audio/')) {
        category = 'audio';
      } else {
        this.toast.add({
          severity: 'warn',
          summary: 'Tipo no soportado',
          detail: 'Solo imagen, video o audio.',
        });
        done();
        continue;
      }

      this.filesApi
        .upload({ file: f, category, storage: 'persistent' })
        .subscribe({
          next: (up) => {
            if (up.error || !up.data) {
              this.toast.add({ severity: 'error', summary: 'Upload error', detail: up.msg });
              done();
              return;
            }
            const fileId = up.data.id;
            this.studio.addFreeAsset({
              id: fileId,
              kind: inferKind(f),
              filename: up.data.filename,
              thumbnailUrl: this.filesApi.serveUrl(fileId),
              tag: '',
              slot: 'free',
            });
            if (projectId && chapterId) {
              this.projectsApi
                .assignAssetToChapter(projectId, chapterId, fileId, slot)
                .subscribe({
                  next: (res) => {
                    if (res?.data?.id) {
                      this.studio.registerChapterAssetAssignment(fileId, res.data.id);
                    }
                    this.markAssigned(slot);
                    this.refreshAssignments(projectId, chapterId);
                  },
                  error: () =>
                    this.toast.add({
                      severity: 'error',
                      summary: 'Asignación fallida',
                      detail: `No se pudo asignar ${f.name} al slot ${slot}.`,
                    }),
                  complete: () => done(),
                });
            } else {
              done();
            }
          },
          error: () => {
            this.toast.add({
              severity: 'error',
              summary: 'Upload error',
              detail: `No se pudo subir ${f.name}.`,
            });
            done();
          },
        });
    }
  }

  /** Reload chapter assignments so the store reflects the new slot. */
  private refreshAssignments(projectId: string, chapterId: string): void {
    this.projectsApi.getChapterAssignments(projectId, chapterId).subscribe((res) => {
      if (!res.error && res.data) {
        this.studio.setChapterAssignments(res.data);
      }
    });
  }
}

/** Extract the numeric part of an [ImageN]/[VideoN]/[AudioN] slot; 0 when absent. */
function slotNum(slot: string | undefined): number {
  if (!slot) return 0;
  const m = slot.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}
