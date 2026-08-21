import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Popover } from 'primeng/popover';
import { ElementEntity } from '@app/services/shot-builder.service';
import { StudioStore } from '@app/core/stores/studio.store';
import { CharactersService } from '@app/modules/characters/characters/services';
import { CharacterMetadata } from '@app/modules/characters/characters/interfaces';
import { SourceThumbnailAssetPipe } from '@app/core/pipes';
import { AssetInfoPopoverComponent } from '@shared/components/asset-info-popover/asset-info-popover.component';

type DecisionType = NonNullable<ElementEntity['user_decision']>['type'];

interface DecisionOption {
  value: DecisionType;
  labelKey: string;
  icon: string;
}

/** One selectable resource in the reference popover — an episode-assigned
 *  resource (chapter character or free asset) or an unassigned library item. */
interface PickerEntry {
  /** Value stored in linked_asset_id: character id or free-asset file id. */
  key: string;
  name: string;
  /** File id for the thumbnail preview. */
  fileId: string;
  kind: 'image' | 'video' | 'audio';
  section: 'episode' | 'library';
  /** [ImageN]/[VideoN]/[AudioN] slot when the resource is episode-assigned. */
  slot?: string;
}

const DECISION_OPTIONS: DecisionOption[] = [
  {
    value: 'define_with_reference',
    labelKey: 'STUDIO.SHOT_BUILDER.ANALYSIS.DECISION.DEFINE_WITH_REFERENCE',
    icon: 'pi-image',
  },
  {
    value: 'define_with_text',
    labelKey: 'STUDIO.SHOT_BUILDER.ANALYSIS.DECISION.DEFINE_WITH_TEXT',
    icon: 'pi-align-left',
  },
  {
    value: 'invent_free',
    labelKey: 'STUDIO.SHOT_BUILDER.ANALYSIS.DECISION.INVENT_FREE',
    icon: 'pi-sparkles',
  },
  {
    value: 'invent_restricted',
    labelKey: 'STUDIO.SHOT_BUILDER.ANALYSIS.DECISION.INVENT_RESTRICTED',
    icon: 'pi-lock',
  },
  {
    value: 'abstract',
    labelKey: 'STUDIO.SHOT_BUILDER.ANALYSIS.DECISION.ABSTRACT',
    icon: 'pi-eye-slash',
  },
];

const CATEGORY_ORDER = [
  'character',
  'animal',
  'prop',
  'location',
  'vehicle',
  'wardrobe',
  'screen_content',
  'weather',
  'sound_object',
  'other',
];

const RESOLVED_STATUSES = ['defined', 'invented', 'abstracted'] as const;

interface SceneGroup {
  sceneNumber: number;
  entities: ElementEntity[];
}

const ANALYSIS_PREFIX = 'STUDIO.SHOT_BUILDER.ANALYSIS';

/** Character metadata arrives from the wire as a JSON string; some surfaces
 *  store it already parsed. Handle both. */
function parseCharacterMetadata(raw: string | null | undefined): CharacterMetadata {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as CharacterMetadata;
    } catch {
      return {};
    }
  }
  return raw as CharacterMetadata;
}

/**
 * Elicitation UI (world-closing fase 4): tarjetas por entidad agrupadas por
 * escena con las 5 decisiones fijas. Emite patches parciales de entidad; el
 * panel los aplica al registry (con dedup por consistency_group). El popover
 * de referencia lista los recursos del episodio (chapter characters + free
 * assets) y la biblioteca aún sin asignar al capítulo.
 */
@Component({
  selector: 'app-element-elicitation',
  imports: [
    CommonModule,
    TranslatePipe,
    Popover,
    SourceThumbnailAssetPipe,
    AssetInfoPopoverComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="elicit-root flex flex-col gap-2" [attr.aria-label]="titleKey | translate">
      <div class="flex items-center gap-2">
        <span class="section-tag">{{ titleKey | translate }}</span>
        @if (pendingCount() > 0) {
          <span class="rounded-full bg-yellow-900 px-2 py-0.5 text-[10px] text-yellow-300">
            {{ pendingCount() }}
          </span>
        }
      </div>

      @for (group of groups(); track group.sceneNumber) {
        <div class="elicit-scene-card rounded-lg border border-ink-700 p-2">
          <div class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
            {{ sceneKey | translate: { number: group.sceneNumber } }}
          </div>
          <div class="flex flex-col gap-2">
            @for (entity of group.entities; track entity.entity_id) {
              <div
                class="elicit-entity-card rounded-md p-2"
                [class.elicit-entity-pending]="!isResolved(entity)"
                role="group"
                [attr.aria-label]="entity.mentioned_as"
              >
                <div class="flex items-start gap-2.5">
                  @if (linkedAsset(entity); as asset) {
                    <button
                      type="button"
                      class="elicit-asset-thumb"
                      [attr.aria-label]="assetInfoAriaKey | translate"
                      [disabled]="disabled()"
                      (click)="openLinkedAssetInfo(entity, $event)"
                    >
                      @if (asset.kind === 'image' && !isThumbBroken(asset.fileId)) {
                        <img
                          [src]="asset.fileId | sourceThumbnailAsset"
                          [alt]="asset.name"
                          (error)="onThumbError(asset.fileId)"
                        />
                      } @else {
                        <i
                          class="pi {{ kindIcon(asset.kind) }} text-base text-primary-400"
                          aria-hidden="true"
                        ></i>
                      }
                      <span class="elicit-thumb-hint" aria-hidden="true">ⓘ</span>
                    </button>
                  }

                  <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span class="elicit-entity-name">{{ entity.mentioned_as }}</span>
                      <span class="elicit-type-chip">
                        {{ categoryKey(entity.category) | translate }}
                      </span>
                      @if (entity.definition_status === 'asset_orphan') {
                        <span
                          class="rounded bg-yellow-900 px-1.5 py-0.5 text-[10px] text-yellow-300"
                        >
                          {{ orphanKey | translate }}
                        </span>
                      } @else if (isResolved(entity)) {
                        <span class="rounded bg-green-900 px-1.5 py-0.5 text-[10px] text-green-300">
                          {{ statusKey(entity) | translate }}
                        </span>
                      } @else {
                        <span class="elicit-pending-badge">
                          <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
                          {{ pendingKey | translate }}
                        </span>
                      }
                    </div>

                    @if (linkedAsset(entity); as asset) {
                      <div class="elicit-meta-line">
                        @if (asset.slot) {
                          <span class="elicit-slot-tag">{{ asset.slot }}</span>
                        }
                        <span class="truncate text-[11px] text-fg-muted">{{ asset.name }}</span>
                      </div>
                    }

                    @if (entity.source_text) {
                      <p class="elicit-quote">“{{ entity.source_text }}”</p>
                    }
                  </div>
                </div>

                <div class="mt-2 flex flex-wrap gap-1">
                  @for (option of options; track option.value) {
                    <button
                      type="button"
                      class="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors focus-visible:outline focus-visible:outline-primary-400"
                      [class.border-primary-400]="chosenType(entity) === option.value"
                      [class.bg-primary-400]="chosenType(entity) === option.value"
                      [class.text-ink-900]="chosenType(entity) === option.value"
                      [class.border-ink-600]="chosenType(entity) !== option.value"
                      [class.text-fg-muted]="chosenType(entity) !== option.value"
                      [class.hover:border-primary-400]="chosenType(entity) !== option.value"
                      [attr.aria-pressed]="chosenType(entity) === option.value"
                      [disabled]="disabled()"
                      (click)="chooseDecision(entity, option, $event)"
                    >
                      <i [class]="'pi ' + option.icon" aria-hidden="true"></i>
                      {{ option.labelKey | translate }}
                    </button>
                  }
                </div>

                @switch (chosenType(entity)) {
                  @case ('define_with_text') {
                    <textarea
                      class="mt-2 h-14 w-full resize-y rounded-md border border-ink-600 bg-ink-900 p-1.5 text-[12px] text-fg focus:border-primary-400 focus:outline-none"
                      rows="2"
                      [attr.aria-label]="descPlaceholderKey | translate"
                      [placeholder]="descPlaceholderKey | translate"
                      [value]="entity.user_decision?.description || ''"
                      (input)="onDescriptionInput(entity, $any($event.target).value)"
                    ></textarea>
                  }
                  @case ('invent_restricted') {
                    <textarea
                      class="mt-2 h-14 w-full resize-y rounded-md border border-ink-600 bg-ink-900 p-1.5 text-[12px] text-fg focus:border-primary-400 focus:outline-none"
                      rows="2"
                      [attr.aria-label]="descPlaceholderKey | translate"
                      [placeholder]="descPlaceholderKey | translate"
                      [value]="entity.user_decision?.description || ''"
                      (input)="onDescriptionInput(entity, $any($event.target).value)"
                    ></textarea>
                  }
                }

                @if (dedupScenes(entity).length > 0) {
                  <p class="mt-1 text-[10px] text-fg-muted">
                    {{ dedupNoteKey | translate: { scenes: dedupScenes(entity) } }}
                  </p>
                }
              </div>
            }
          </div>
        </div>
      }
    </section>

    <p-popover #assignPopover [dismissable]="true" styleClass="asset-popover-z">
      @if (assignTarget(); as target) {
        <div class="elicit-assign-popover">
          <p class="elicit-popover-title">
            {{ assignTitleKey | translate: { name: target.mentioned_as } }}
          </p>
          <input
            type="text"
            class="elicit-lib-search"
            placeholder="{{ 'STUDIO.SHOT_BUILDER.SEARCH_PLACEHOLDER' | translate }}"
            [value]="assetSearch()"
            (input)="onAssetSearch($event)"
            [attr.aria-label]="'STUDIO.SHOT_BUILDER.SEARCH_RESOURCE_ARIA' | translate"
          />
          @if (filteredEpisode().length === 0 && filteredLibrary().length === 0) {
            <p class="elicit-popover-empty">{{ 'STUDIO.SHOT_BUILDER.TAB_EMPTY' | translate }}</p>
          } @else {
            @if (filteredEpisode().length > 0) {
              <p class="elicit-section-label">
                {{ 'STUDIO.SHOT_BUILDER.EPISODE_LABEL' | translate }}
              </p>
              <div class="elicit-asset-grid">
                @for (entry of filteredEpisode(); track entry.key) {
                  <button
                    type="button"
                    class="elicit-asset-tile"
                    [class.elicit-asset-active]="entry.key === target.linked_asset_id"
                    (click)="pickAsset(entry.key)"
                    [title]="entry.name"
                  >
                    @if (entry.kind === 'image' && !isThumbBroken(entry.fileId)) {
                      <img
                        [src]="entry.fileId | sourceThumbnailAsset"
                        [alt]="entry.name"
                        class="elicit-asset-img"
                        loading="lazy"
                        (error)="onThumbError(entry.fileId)"
                      />
                    } @else {
                      <div class="elicit-asset-placeholder">
                        <i class="pi {{ kindIcon(entry.kind) }}" aria-hidden="true"></i>
                      </div>
                    }
                  </button>
                }
              </div>
            }
            @if (filteredLibrary().length > 0) {
              <p class="elicit-section-label">
                {{ 'STUDIO.SHOT_BUILDER.LIBRARY' | translate }}
              </p>
              <div class="elicit-asset-grid">
                @for (entry of filteredLibrary(); track entry.key) {
                  <button
                    type="button"
                    class="elicit-asset-tile"
                    [class.elicit-asset-active]="entry.key === target.linked_asset_id"
                    (click)="pickAsset(entry.key)"
                    [title]="entry.name"
                  >
                    @if (entry.kind === 'image' && !isThumbBroken(entry.fileId)) {
                      <img
                        [src]="entry.fileId | sourceThumbnailAsset"
                        [alt]="entry.name"
                        class="elicit-asset-img"
                        loading="lazy"
                        (error)="onThumbError(entry.fileId)"
                      />
                    } @else {
                      <div class="elicit-asset-placeholder">
                        <i class="pi {{ kindIcon(entry.kind) }}" aria-hidden="true"></i>
                      </div>
                    }
                  </button>
                }
              </div>
            }
          }
          @if (target.linked_asset_id) {
            <button type="button" class="elicit-clear-btn" (click)="clearLinkedAsset()">
              <i class="pi pi-times" aria-hidden="true"></i>
              {{ clearKey | translate }}
            </button>
          }
          <input
            #uploadInput
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            class="hidden"
            [attr.aria-hidden]="true"
            tabindex="-1"
            (change)="onUploadFilesSelected($event)"
          />
          <button
            type="button"
            class="elicit-clear-btn"
            [disabled]="disabled()"
            (click)="triggerUpload(uploadInput)"
          >
            <i class="pi pi-upload" aria-hidden="true"></i>
            {{ uploadKey | translate }}
          </button>
        </div>
      }
    </p-popover>

    <app-asset-info-popover #linkedAssetInfo />
  `,
  styles: [
    `
      .elicit-assign-popover {
        width: 320px;
        padding: 12px;
        background: var(--panel, #121f21);
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-shadow: 0 0 18px rgba(79, 176, 181, 0.12);
      }
      .elicit-popover-title {
        margin: 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--amber, #e0a95c);
        text-shadow: 0 0 8px rgba(224, 169, 92, 0.45);
      }
      .elicit-lib-search {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--ink, #ece6d8);
        background: var(--bg2, #0f1a1c);
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        padding: 3px 7px;
        outline: none;
      }
      .elicit-lib-search:focus {
        border-color: var(--teal, #4fb0b5);
        box-shadow: 0 0 8px rgba(79, 176, 181, 0.35);
      }
      .elicit-lib-search::placeholder {
        color: var(--ink-faint, #6a7977);
      }
      .elicit-section-label {
        margin: 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
      }
      .elicit-asset-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
        gap: 8px;
        max-height: 180px;
        overflow-y: auto;
      }
      .elicit-asset-tile {
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
      .elicit-asset-tile:hover {
        border-color: var(--teal, #4fb0b5);
        box-shadow: 0 0 10px rgba(79, 176, 181, 0.4);
      }
      .elicit-asset-tile.elicit-asset-active {
        border-color: #5fb98f;
        box-shadow:
          0 0 10px rgba(95, 185, 143, 0.55),
          0 0 0 1px #5fb98f;
      }
      .elicit-asset-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .elicit-asset-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ink-faint, #6a7977);
        font-size: 14px;
      }
      .elicit-popover-empty {
        margin: 0;
        font-size: 12px;
        color: var(--ink-faint, #6a7977);
        font-style: italic;
      }
      .elicit-clear-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        align-self: flex-start;
        background: transparent;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        color: var(--ink-dim, #9aa6a3);
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        padding: 3px 8px;
        cursor: pointer;
        transition:
          color 0.15s ease,
          border-color 0.15s ease;
      }
      .elicit-clear-btn:hover {
        color: var(--ink, #ece6d8);
        border-color: var(--teal, #4fb0b5);
        box-shadow: 0 0 8px rgba(79, 176, 181, 0.3);
      }
      /* Neon accents over the existing palette (subtle glows). */
      .elicit-scene-card {
        border-color: rgba(79, 176, 181, 0.4);
        box-shadow:
          inset 0 0 20px rgba(79, 176, 181, 0.06),
          0 0 16px rgba(79, 176, 181, 0.12);
      }
      .elicit-entity-card {
        border: 1px solid rgba(79, 176, 181, 0.18);
        background: linear-gradient(135deg, #111d1f 0%, #0d1719 100%);
        transition:
          box-shadow 0.2s ease,
          border-color 0.2s ease;
      }
      .elicit-entity-card:hover {
        border-color: rgba(79, 176, 181, 0.45);
        box-shadow: 0 0 14px rgba(79, 176, 181, 0.2);
      }
      .elicit-entity-pending {
        border-color: rgba(234, 179, 8, 0.45);
        box-shadow: 0 0 10px rgba(234, 179, 8, 0.15);
      }
      .elicit-entity-pending:hover {
        border-color: rgba(234, 179, 8, 0.6);
        box-shadow: 0 0 14px rgba(234, 179, 8, 0.25);
      }
      .elicit-pending-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 1px 6px;
        border-radius: 9999px;
        background: rgba(234, 179, 8, 0.15);
        color: #f59e0b;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .elicit-asset-thumb {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 63px;
        height: 63px;
        flex-shrink: 0;
        overflow: hidden;
        padding: 0;
        border: 1px solid rgba(79, 176, 181, 0.4);
        border-radius: 6px;
        background: var(--bg2, #0f1a1c);
        cursor: pointer;
        transition:
          box-shadow 0.15s ease,
          border-color 0.15s ease;
      }
      .elicit-asset-thumb:hover,
      .elicit-asset-thumb:focus-visible {
        border-color: var(--teal, #4fb0b5);
        box-shadow: 0 0 12px rgba(79, 176, 181, 0.55);
      }
      .elicit-asset-thumb:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
      .elicit-asset-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .elicit-thumb-hint {
        position: absolute;
        right: 2px;
        bottom: 2px;
        width: 12px;
        height: 12px;
        border-radius: 3px;
        background: rgba(12, 19, 21, 0.75);
        color: rgba(255, 255, 255, 0.85);
        font-size: 8px;
        line-height: 12px;
        text-align: center;
      }
      .elicit-entity-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--ink, #ece6d8);
        text-shadow: 0 0 10px rgba(236, 230, 216, 0.22);
      }
      .elicit-type-chip {
        padding: 1px 6px;
        border: 1px solid rgba(79, 176, 181, 0.35);
        border-radius: 9999px;
        color: #7fd0d4;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        box-shadow: 0 0 6px rgba(79, 176, 181, 0.2);
      }
      .elicit-meta-line {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .elicit-slot-tag {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--amber, #e0a95c);
        text-shadow: 0 0 8px rgba(224, 169, 92, 0.5);
      }
      .elicit-quote {
        margin-top: 2px;
        border-left: 2px solid rgba(79, 176, 181, 0.4);
        padding-left: 6px;
        font-size: 11px;
        font-style: italic;
        color: var(--fg-muted, #9aa5a6);
      }
      .elicit-root [aria-pressed='true'] {
        box-shadow: 0 0 10px rgba(79, 176, 181, 0.45);
        text-shadow: 0 0 6px rgba(79, 176, 181, 0.6);
      }
      .elicit-root [aria-pressed='false']:hover:not(:disabled) {
        box-shadow: 0 0 8px rgba(79, 176, 181, 0.22);
      }
    `,
  ],
})
export class ElementElicitationComponent {
  private readonly studio = inject(StudioStore);
  private readonly chars = inject(CharactersService);

  readonly registry = input.required<ElementEntity[]>();
  readonly disabled = input(false);

  readonly entityChange = output<{ entityId: string; patch: Partial<ElementEntity> }>();
  readonly filesSelected = output<File[]>();

  readonly options = DECISION_OPTIONS;

  readonly titleKey = `${ANALYSIS_PREFIX}.TITLE`;
  readonly sceneKey = `${ANALYSIS_PREFIX}.SCENE`;
  readonly orphanKey = `${ANALYSIS_PREFIX}.STATUS.ASSET_ORPHAN`;
  readonly pendingKey = `${ANALYSIS_PREFIX}.STATUS.PENDING`;
  readonly assignTitleKey = `${ANALYSIS_PREFIX}.ASSIGN_TITLE`;
  readonly clearKey = `${ANALYSIS_PREFIX}.CLEAR_REFERENCE`;
  readonly descPlaceholderKey = `${ANALYSIS_PREFIX}.DESCRIPTION_PLACEHOLDER`;
  readonly dedupNoteKey = `${ANALYSIS_PREFIX}.DEDUP_NOTE`;
  readonly assetInfoAriaKey = `${ANALYSIS_PREFIX}.ASSET_INFO_ARIA`;
  readonly uploadKey = 'STUDIO.SHOT_BUILDER.UPLOAD_FREE_ASSET';

  private readonly assignPopover = viewChild.required(Popover);
  private readonly linkedAssetInfo = viewChild.required(AssetInfoPopoverComponent);

  readonly assignTarget = signal<ElementEntity | null>(null);
  readonly assetSearch = signal('');

  /** IDs of thumbnails that failed to load. */
  private readonly brokenThumbs = signal<Set<string>>(new Set());

  /** Episode-assigned resources: chapter characters + free assets. */
  private readonly episodeEntries = computed<PickerEntry[]>(() => {
    const out: PickerEntry[] = [];
    for (const c of this.studio.chapterCharacterData()) {
      out.push({
        key: c.id,
        name: c.name,
        fileId: c.fileId,
        kind: c.kind === 'video' ? 'video' : c.kind === 'audio' ? 'audio' : 'image',
        section: 'episode',
        slot: c.slot || undefined,
      });
    }
    for (const a of this.studio.freeAssets()) {
      out.push({
        key: a.id,
        name: a.filename,
        fileId: a.id,
        kind: a.kind === 'video' ? 'video' : a.kind === 'audio' ? 'audio' : 'image',
        section: 'episode',
        slot: this.studio.chapterAssetSlots().get(a.id) || undefined,
      });
    }
    return out;
  });

  /** Library resources NOT yet assigned to the chapter. */
  private readonly libraryEntries = computed<PickerEntry[]>(() => {
    const assignedIds = this.studio.chapterCharacterIds();
    const out: PickerEntry[] = [];
    for (const item of this.chars.items()) {
      const c = item.character;
      if (!c?.id || assignedIds.has(c.id)) continue;
      const metadata = parseCharacterMetadata(c.metadata);
      out.push({
        key: c.id,
        name: c.name,
        fileId: item.files?.[0]?.file_id || '',
        kind:
          metadata.fileKind === 'video'
            ? 'video'
            : metadata.fileKind === 'audio'
              ? 'audio'
              : 'image',
        section: 'library',
      });
    }
    return out;
  });

  private readonly allEntries = computed<PickerEntry[]>(() => [
    ...this.episodeEntries(),
    ...this.libraryEntries(),
  ]);

  readonly filteredEpisode = computed(() =>
    ElementElicitationComponent.filterByName(this.episodeEntries(), this.assetSearch()),
  );

  readonly filteredLibrary = computed(() =>
    ElementElicitationComponent.filterByName(this.libraryEntries(), this.assetSearch()),
  );

  private static filterByName(entries: PickerEntry[], query: string): PickerEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }

  readonly groups = computed<SceneGroup[]>(() => {
    const byScene = new Map<number, ElementEntity[]>();
    for (const entity of this.registry()) {
      const list = byScene.get(entity.scene_number) ?? [];
      list.push(entity);
      byScene.set(entity.scene_number, list);
    }
    return [...byScene.entries()]
      .sort(([a], [b]) => a - b)
      .map(([sceneNumber, entities]) => ({
        sceneNumber,
        entities: [...entities].sort(
          (a, b) =>
            CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
            a.mentioned_as.localeCompare(b.mentioned_as),
        ),
      }));
  });

  readonly pendingCount = computed(() => this.registry().filter((e) => !this.isResolved(e)).length);

  chosenType(entity: ElementEntity): DecisionType | null {
    return entity.user_decision?.type ?? null;
  }

  isResolved(entity: ElementEntity): boolean {
    return (
      (RESOLVED_STATUSES as readonly string[]).includes(entity.definition_status) ||
      // Auto-linked by the backend (linked_asset_id present, no user decision yet)
      // counts as resolved — the entity already has a concrete reference.
      (!!entity.linked_asset_id && !entity.user_decision)
    );
  }


  chooseDecision(entity: ElementEntity, option: DecisionOption, event?: Event): void {
    // For reference mode always (re)open the picker — no intermediate step.
    if (option.value === 'define_with_reference') {
      if (this.chosenType(entity) !== 'define_with_reference') {
        this.entityChange.emit({
          entityId: entity.entity_id,
          patch: { user_decision: { type: option.value }, definition_status: 'pending' },
        });
      }
      if (event) this.openAssetPicker(entity, event);
      return;
    }

    if (this.chosenType(entity) === option.value) return;
    const immediate =
      option.value === 'invent_free'
        ? 'invented'
        : option.value === 'abstract'
          ? 'abstracted'
          : 'pending';
    this.entityChange.emit({
      entityId: entity.entity_id,
      patch: { user_decision: { type: option.value }, definition_status: immediate },
    });
  }

  openAssetPicker(entity: ElementEntity, event: Event): void {
    this.assignTarget.set(entity);
    this.assetSearch.set('');
    this.assignPopover().toggle(event);
  }

  onAssetSearch(event: Event): void {
    this.assetSearch.set((event.target as HTMLInputElement).value);
  }

  pickAsset(assetId: string): void {
    const entity = this.assignTarget();
    if (!entity || entity.linked_asset_id === assetId) {
      this.assignPopover().hide();
      return;
    }
    this.entityChange.emit({
      entityId: entity.entity_id,
      patch: {
        linked_asset_id: assetId,
        user_decision: { type: 'define_with_reference' },
        definition_status: 'defined',
      },
    });
    this.assignPopover().hide();
  }

  clearLinkedAsset(): void {
    const entity = this.assignTarget();
    if (!entity?.linked_asset_id) return;
    this.entityChange.emit({
      entityId: entity.entity_id,
      patch: { linked_asset_id: undefined, definition_status: 'pending' },
    });
  }

  triggerUpload(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  /** Forwards the picked files to the parent (panel) which owns the upload
   *  flow; resets the input so re-selecting the same file re-triggers. */
  onUploadFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files ? Array.from(input.files) : [];
    if (files.length === 0) return;
    this.filesSelected.emit(files);
    if (input) input.value = '';
  }

  linkedAsset(entity: ElementEntity): PickerEntry | undefined {
    const id = entity.linked_asset_id;
    if (!id) return undefined;
    // Match by key (character_id for characters, file_id for free assets)
    // or by fileId (asset orphan entities carry the file UUID as linked_asset_id).
    return (
      this.allEntries().find((e) => e.key === id || e.fileId === id) ?? undefined
    );
  }

  /** Open the metadata/preview popover for the entity's assigned asset
   *  (same previewer as My Library), without opening the picker. */
  openLinkedAssetInfo(entity: ElementEntity, event: Event): void {
    const asset = this.linkedAsset(entity);
    if (!asset?.fileId) return;
    event.stopPropagation();
    this.linkedAssetInfo().open(event, {
      id: asset.fileId,
      name: asset.name,
      kind: asset.kind,
    });
  }

  kindIcon(kind: PickerEntry['kind']): string {
    if (kind === 'video') return 'pi-video';
    if (kind === 'audio') return 'pi-volume-up';
    return 'pi-image';
  }

  isThumbBroken(fileId: string): boolean {
    return this.brokenThumbs().has(fileId);
  }

  onThumbError(fileId: string): void {
    this.brokenThumbs.update((set) => new Set(set).add(fileId));
  }

  onDescriptionInput(entity: ElementEntity, description: string): void {
    const trimmed = description.trim();
    const type = this.chosenType(entity);
    if (!type) return;
    const finalStatus = type === 'define_with_text' ? 'defined' : 'invented';
    this.entityChange.emit({
      entityId: entity.entity_id,
      patch: {
        user_decision: { type, description: trimmed || undefined },
        definition_status: trimmed ? finalStatus : 'pending',
      },
    });
  }

  categoryKey(category: string): string {
    return `${ANALYSIS_PREFIX}.CATEGORY.${category.toUpperCase()}`;
  }

  statusKey(entity: ElementEntity): string {
    if (entity.definition_status === 'invented') return `${ANALYSIS_PREFIX}.STATUS.INVENTED`;
    if (entity.definition_status === 'abstracted') return `${ANALYSIS_PREFIX}.STATUS.ABSTRACTED`;
    return `${ANALYSIS_PREFIX}.STATUS.DEFINED`;
  }

  /** Escenas hermanas del consistency_group (la decisión se replica en ellas). */
  dedupScenes(entity: ElementEntity): number[] {
    if (!this.isResolved(entity) || !entity.consistency_group) return [];
    return [
      ...new Set(
        this.registry()
          .filter(
            (e) =>
              e.consistency_group === entity.consistency_group && e.entity_id !== entity.entity_id,
          )
          .map((e) => e.scene_number),
      ),
    ].sort((a, b) => a - b);
  }
}
