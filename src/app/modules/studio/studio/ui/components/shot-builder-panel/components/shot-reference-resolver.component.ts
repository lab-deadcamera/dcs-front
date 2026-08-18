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
import { Observable, forkJoin, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Popover } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { StudioStore } from '@app/core/stores/studio.store';
import { FilesApiService } from '@app/services/files-api.service';
import { ProjectsApiService } from '@app/modules/projects/projects/services/projects-api.service';
import { FileCategory } from '@app/core/interfaces';
import { Reference, ReferenceType } from '@app/core/interfaces';
import { SourceAssetPipe, SourceThumbnailAssetPipe } from '@app/core/pipes';
import {
  ResolvedRefInfo,
  inferKind,
  resolveReferenceInfo,
  resolveReferenceInfoBySlot,
} from '@app/shared/utils';
import { AssetViewerComponent } from '@shared/components/asset-viewer/asset-viewer.component';
import { AssetType, CharacterMetadata } from '@app/modules/characters/characters/interfaces';
import { CharactersService } from '@app/modules/characters/characters/services';

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
    SourceThumbnailAssetPipe,
    AssetViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ref-resolver">
      <!-- Header + unresolved badge -->
      <div class="ref-header">
        <span class="section-tag ref-title">{{ 'STUDIO.SHOT_BUILDER.REFERENCES_SECTION' | translate }}</span>
        @if (unresolved().length > 0) {
          <span class="ref-badge" [attr.title]="'STUDIO.SHOT_BUILDER.UNRESOLVED_COUNT' | translate: { n: unresolved().length }">
            {{ 'STUDIO.SHOT_BUILDER.UNRESOLVED_COUNT' | translate: { n: unresolved().length } }}
          </span>
        }
      </div>

      <div class="refs-summary">
        @for (ref of references(); track ref.slot) {
          <span class="ref-chip-wrap">
            <button
              type="button"
              class="ref-chip ref-chip-button"
              [class.ref-chip-unresolved]="isUnresolvedRef(ref)"
              [class.ref-chip-ok]="!isUnresolvedRef(ref)"
              (click)="openInfoPopover($event, ref)"
              [title]="'STUDIO.SHOT_BUILDER.VIEW_ASSET_METADATA' | translate"
            >
              <em>{{ ref.slot }}</em>
              <span class="ref-name">{{ refNameFor(ref) }}</span>
              <span class="ref-type">{{ refTypeLabel(ref.type) }}</span>
            </button>
            @if (isUnresolvedRef(ref)) {
              <button
                type="button"
                class="ref-assign-btn"
                (click)="openAssignPopover($event, ref)"
                [pTooltip]="'STUDIO.SHOT_BUILDER.ASSIGN_FREE_ASSET' | translate"
                tooltipPosition="top"
                [attr.aria-label]="'STUDIO.SHOT_BUILDER.ASSIGN_FREE_ASSET' | translate"
              >
                <i class="pi pi-plus" aria-hidden="true"></i>
              </button>
            } @else {
              <button
                type="button"
                class="ref-reassign-btn"
                (click)="openAssignPopover($event, ref)"
                [pTooltip]="'STUDIO.SHOT_BUILDER.CHANGE_ASSIGNED_RESOURCE' | translate"
                tooltipPosition="top"
                [attr.aria-label]="'STUDIO.SHOT_BUILDER.CHANGE_ASSIGNED_RESOURCE' | translate"
              >
                <i class="pi pi-refresh" aria-hidden="true"></i>
              </button>
            }
          </span>
        }
        @if (references().length === 0) {
          <span class="ref-empty">{{ 'STUDIO.SEQUENCE.NO_REFS' | translate }}</span>
        }
      </div>

      <!-- Assign popover -->
      <p-popover #assignPopover [dismissable]="true" styleClass="asset-popover-z">
        @if (assignTarget(); as target) {
          <div class="ref-assign-popover">
            <p class="ref-popover-title" [innerHTML]="'STUDIO.SHOT_BUILDER.ASSIGN_ASSET_TO_SLOT' | translate: { slot: target.slot }"></p>

            <!-- Library resources (Characters library) — pick a character,
                 location, prop or audio and assign it to this slot. -->
            <div class="ref-lib">
              <div class="ref-lib-head">
                <span class="ref-lib-label">{{ 'STUDIO.SHOT_BUILDER.LIBRARY' | translate }}</span>
                <input
                  type="text"
                  class="ref-lib-search"
                  placeholder="{{ 'STUDIO.SHOT_BUILDER.SEARCH_PLACEHOLDER' | translate }}"
                  [value]="libSearch()"
                  (input)="onLibSearch($event)"
                  [attr.aria-label]="'STUDIO.SHOT_BUILDER.SEARCH_RESOURCE_ARIA' | translate"
                />
              </div>
              <div class="ref-lib-tabs">
                  @for (t of libTabs; track t.id) {
                    <button
                      type="button"
                      class="ref-lib-tab"
                      [class.on]="activeLibType() === t.id"
                      (click)="activeLibType.set(t.id)"
                      [attr.aria-pressed]="activeLibType() === t.id"
                    >
                      {{ t.labelKey | translate }}
                      <span class="ref-lib-count">{{ libraryByType()[t.id].length }}</span>
                    </button>
                  }
                </div>

              <div class="ref-lib-grid">
                @for (r of pagedLibrary(); track r.id) {
                  <button
                    type="button"
                    class="ref-lib-tile"
                    (click)="assignLibraryResource(r, target.slot)"
                    [title]="r.name"
                  >
                    @if (r.kind === 'image' && r.fileId && !isThumbBroken(r.fileId)) {
                      <img
                        [src]="r.fileId | sourceThumbnailAsset"
                        [alt]="r.name"
                        class="ref-lib-img"
                        loading="lazy"
                        (error)="onThumbError(r.fileId)"
                      />
                    } @else {
                      <div class="ref-asset-placeholder">
                        <i
                          class="pi"
                          [class.pi-image]="r.kind === 'image'"
                          [class.pi-video]="r.kind === 'video'"
                          [class.pi-volume-up]="r.kind === 'audio'"
                          aria-hidden="true"
                        ></i>
                      </div>
                    }
                    <span class="ref-lib-name">{{ r.name }}</span>
                  </button>
                }
              </div>
              @if (libraryByType()[activeLibType()].length === 0) {
                <p class="ref-popover-empty">{{ 'STUDIO.SHOT_BUILDER.TAB_EMPTY' | translate }}</p>
              }
              @if (libTotalPages() > 1) {
                <div class="ref-pagination">
                  <button type="button" class="ref-page-btn" [disabled]="libPage() === 0" (click)="libGoPrev()">
                    <i class="pi pi-chevron-left" aria-hidden="true"></i>
                  </button>
                  <span class="ref-page-info">{{ libPage() + 1 }} / {{ libTotalPages() }}</span>
                  <button type="button" class="ref-page-btn" [disabled]="libPage() >= libTotalPages() - 1" (click)="libGoNext(libraryByType()[activeLibType()].length)">
                    <i class="pi pi-chevron-right" aria-hidden="true"></i>
                  </button>
                </div>
              }
            </div>

            <!-- Episode assignments: chapter characters + free assets -->
            <div class="ref-episode-head">
              <span class="ref-episode-label">{{ 'STUDIO.SHOT_BUILDER.EPISODE_LABEL' | translate }}</span>
              @if (episodeResources().length > 0) {
                <input
                  type="text"
                  class="ref-lib-search"
                  placeholder="{{ 'STUDIO.SHOT_BUILDER.SEARCH_PLACEHOLDER' | translate }}"
                  [value]="episodeSearch()"
                  (input)="onEpisodeSearch($event)"
                  [attr.aria-label]="'STUDIO.SHOT_BUILDER.SEARCH_RESOURCE_ARIA' | translate"
                />
              }
            </div>
            @if (filteredEpisodeResources().length > 0) {
              <div class="ref-asset-grid">
                @for (r of pagedEpisodeResources(); track r.id) {
                  <button
                    type="button"
                    class="ref-asset-tile"
                    [class.ref-asset-active]="r.slot === target.slot"
                    [class.ref-asset-broken]="r.fileId ? isThumbBroken(r.fileId) : false"
                    (click)="assignEpisodeResource(r, target.slot)"
                    [title]="r.slot ? r.slot + ' · ' + r.name : r.name"
                  >
                    @if (r.kind === 'image' && r.fileId && !isThumbBroken(r.fileId)) {
                      <img
                        [src]="r.fileId | sourceAsset"
                        [alt]="r.name"
                        class="ref-asset-img"
                        loading="lazy"
                        (error)="onThumbError(r.fileId)"
                      />
                    } @else {
                      <div class="ref-asset-placeholder">
                        <i
                          class="pi"
                          [class.pi-image]="r.kind === 'image'"
                          [class.pi-video]="r.kind === 'video'"
                          [class.pi-volume-up]="r.kind === 'audio'"
                          aria-hidden="true"
                        ></i>
                      </div>
                    }
                    <span class="ref-asset-slot">{{ r.slot || ('STUDIO.SHOT_BUILDER.NO_SLOT' | translate) }}</span>
                  </button>
                }
              </div>
              @if (episodeTotalPages() > 1) {
                <div class="ref-pagination">
                  <button type="button" class="ref-page-btn" [disabled]="episodePage() === 0" (click)="episodeGoPrev()">
                    <i class="pi pi-chevron-left" aria-hidden="true"></i>
                  </button>
                  <span class="ref-page-info">{{ episodePage() + 1 }} / {{ episodeTotalPages() }}</span>
                  <button type="button" class="ref-page-btn" [disabled]="episodePage() >= episodeTotalPages() - 1" (click)="episodeGoNext(filteredEpisodeResources().length)">
                    <i class="pi pi-chevron-right" aria-hidden="true"></i>
                  </button>
                </div>
              }
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

      <!-- Reference info popover — metadata of the assigned asset -->
      <p-popover #infoPopover [dismissable]="true" styleClass="asset-popover-z">
        @if (infoTarget(); as ref) {
          <div class="ref-info-popover">
            <p class="ref-popover-title" [innerHTML]="'STUDIO.SHOT_BUILDER.REFERENCE_SLOT_TITLE' | translate: { slot: ref.slot }"></p>

            @if (resolvedInfoFor(ref); as info) {
              @if (info.fileKind === 'image' && info.fileId && !isThumbBroken(info.fileId)) {
                <button
                  type="button"
                  class="ref-info-img-btn"
                  (click)="openRefViewer(info)"
                  [pTooltip]="'STUDIO.SHOT_BUILDER.OPEN_IMAGE_TOOLTIP' | translate"
                  tooltipPosition="top"
                  [attr.aria-label]="'STUDIO.SHOT_BUILDER.OPEN_IMAGE_TOOLTIP' | translate"
                >
                  <img
                    [src]="
                      info.kind === 'character'
                        ? (info.fileId | sourceThumbnailAsset)
                        : (info.fileId | sourceAsset)
                    "
                    [alt]="info.name"
                    class="ref-info-img"
                    loading="lazy"
                    (error)="onThumbError(info.fileId)"
                  />
                  <span class="ref-info-expand" aria-hidden="true">
                    <i class="pi pi-expand"></i>
                  </span>
                </button>
              }

              <dl class="ref-info-dl">
                <div>
                  <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_NAME' | translate }}</dt>
                  <dd>{{ info.name }}</dd>
                </div>
                <div>
                  <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_TYPE' | translate }}</dt>
                  <dd class="cap">{{ refTypeLabel(ref.type) }}</dd>
                </div>
                <div>
                  <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_SLOT' | translate }}</dt>
                  <dd class="mono">{{ ref.slot }}</dd>
                </div>
                @if (info.kind === 'character') {
                  <div>
                    <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_CHARACTER_ID' | translate }}</dt>
                    <dd class="mono">{{ info.charId }}</dd>
                  </div>
                }
                <div>
                  <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_FILE_ID' | translate }}</dt>
                  <dd class="mono">{{ info.fileId }}</dd>
                </div>
              </dl>
            } @else {
              <!-- assetId not matched against the episode → show the raw ref -->
              <dl class="ref-info-dl">
                <div>
                  <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_TYPE' | translate }}</dt>
                  <dd class="cap">{{ refTypeLabel(ref.type) }}</dd>
                </div>
                <div>
                  <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_SLOT' | translate }}</dt>
                  <dd class="mono">{{ ref.slot }}</dd>
                </div>
                <div>
                  <dt>AssetId</dt>
                  <dd class="mono">{{ ref.assetId }}</dd>
                </div>
              </dl>
            }
          </div>
        }
      </p-popover>

      <!-- Full-screen asset viewer (same component as the Files module / shot builder) -->
      <app-asset-viewer
        [(visible)]="viewerVisible"
        [file]="viewerFile()"
        (visibleChange)="viewerFile.set(null)"
      />
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
      .ref-chip-wrap {
        display: inline-flex;
        align-items: center;
        gap: 4px;
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
      .ref-reassign-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border: 1px solid rgba(79, 176, 181, 0.6);
        border-radius: 50%;
        background: transparent;
        color: var(--teal, #4fb0b5);
        cursor: pointer;
        font-size: 10px;
        padding: 0;
        transition: all 0.15s ease;
      }
      .ref-reassign-btn:hover {
        background: var(--teal, #4fb0b5);
        color: #0c1315;
      }
      .ref-chip-button {
        cursor: pointer;
        transition: border-color 0.15s ease;
      }
      .ref-chip-button:hover {
        border-color: var(--teal, #4fb0b5);
        opacity: 1;
      }

      /* Reference info popover */
      .ref-info-popover {
        width: 300px;
        padding: 14px;
        background: var(--panel, #121f21);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ref-info-img-btn {
        position: relative;
        display: block;
        width: 100%;
        padding: 0;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        background: var(--bg2, #0f1a1c);
        overflow: hidden;
        cursor: zoom-in;
        transition: border-color 0.15s ease;
      }
      .ref-info-img-btn:hover {
        border-color: var(--amber, #e0a95c);
      }
      .ref-info-img {
        display: block;
        width: 100%;
        max-height: 160px;
        object-fit: cover;
      }
      .ref-info-expand {
        position: absolute;
        top: 6px;
        right: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.55);
        color: rgba(255, 255, 255, 0.85);
      }
      .ref-info-dl {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .ref-info-dl > div {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }
      .ref-info-dl dt {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
        margin: 0;
        flex-shrink: 0;
      }
      .ref-info-dl dd {
        margin: 0;
        font-size: 12px;
        color: var(--ink, #ece6d8);
        text-align: right;
        word-break: break-all;
      }
      .ref-info-dl dd.cap {
        text-transform: capitalize;
      }
      .ref-info-dl dd.mono {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--ink-dim, #9aa6a3);
      }
      .ref-empty {
        font-size: 12px;
        color: var(--ink-faint, #6a7977);
        font-style: italic;
      }

      /* Popover content */
      .ref-assign-popover {
        width: 400px;
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

      /* Library resources picker */
      .ref-lib {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ref-lib-head {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .ref-lib-search {
        flex: 1;
        min-width: 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--ink, #ece6d8);
        background: var(--bg2, #0f1a1c);
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        padding: 3px 7px;
        outline: none;
      }
      .ref-lib-search:focus {
        border-color: var(--teal, #4fb0b5);
      }
      .ref-lib-search::placeholder {
        color: var(--ink-faint, #6a7977);
      }
      .ref-lib-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
      }
      .ref-lib-tabs {
        display: flex;
        gap: 4px;
      }
      .ref-lib-tab {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9.5px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink-dim, #9aa6a3);
        background: transparent;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        padding: 3px 7px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .ref-lib-tab:hover {
        color: var(--ink, #ece6d8);
      }
      .ref-lib-tab.on {
        color: var(--ink, #ece6d8);
        border-color: var(--teal, #4fb0b5);
      }
      .ref-lib-count {
        color: var(--amber, #e0a95c);
        font-size: 9px;
      }
      .ref-lib-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
        gap: 6px;
      }
      .ref-lib-tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 4px;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        background: var(--bg2, #0f1a1c);
        cursor: pointer;
        transition: border-color 0.15s ease;
      }
      .ref-lib-tile:hover {
        border-color: var(--teal, #4fb0b5);
      }
      .ref-lib-img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 2px;
      }
      .ref-lib-name {
        width: 100%;
        font-family: 'JetBrains Mono', monospace;
        font-size: 8.5px;
        color: var(--ink-dim, #9aa6a3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      .ref-episode-head {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .ref-episode-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
      }
      .ref-pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 6px;
      }
      .ref-page-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        background: transparent;
        color: var(--ink-dim, #9aa6a3);
        cursor: pointer;
        font-size: 10px;
        padding: 0;
        transition: all 0.15s ease;
      }
      .ref-page-btn:hover:not(:disabled) {
        color: var(--ink, #ece6d8);
        border-color: var(--teal, #4fb0b5);
      }
      .ref-page-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .ref-page-info {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--ink-faint, #6a7977);
        min-width: 40px;
        text-align: center;
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
  private readonly chars = inject(CharactersService);
  private readonly i18n = inject(TranslateService);

  @ViewChild('assignPopover') protected readonly assignPopover!: Popover;

  /** Reference currently being assigned (the popover target). */
  protected readonly assignTarget = signal<Reference | null>(null);
  protected readonly uploading = signal(false);

  // ── Library resources picker (Characters library) ────────────────────────

  protected readonly activeLibType = signal<AssetType>('character');

  /** Text the user typed in the library search box (filters by resource name). */
  protected readonly libSearch = signal('');

  protected onLibSearch(event: Event): void {
    this.libSearch.set((event.target as HTMLInputElement).value);
    this.libPage.set(0);
  }

  /** Text the user typed in the episode search box (filters by resource name). */
  protected readonly episodeSearch = signal('');

  protected onEpisodeSearch(event: Event): void {
    this.episodeSearch.set((event.target as HTMLInputElement).value);
    this.episodePage.set(0);
  }

  // ── Pagination ──────────────────────────────────────────────────────────

  protected readonly pageSize = 12;
  protected readonly libPage = signal(0);
  protected readonly episodePage = signal(0);

  protected libGoPrev(): void {
    this.libPage.update((p) => Math.max(0, p - 1));
  }
  protected libGoNext(total: number): void {
    this.libPage.update((p) => Math.min(p + 1, Math.ceil(total / this.pageSize) - 1));
  }
  protected episodeGoPrev(): void {
    this.episodePage.update((p) => Math.max(0, p - 1));
  }
  protected episodeGoNext(total: number): void {
    this.episodePage.update((p) => Math.min(p + 1, Math.ceil(total / this.pageSize) - 1));
  }

  protected readonly libTabs: { id: AssetType; labelKey: string }[] = [
    { id: 'character', labelKey: 'CHARACTERS.TABS.CHARACTER' },
    { id: 'location', labelKey: 'CHARACTERS.TABS.LOCATION' },
    { id: 'prop', labelKey: 'CHARACTERS.TABS.PROP' },
    { id: 'audio', labelKey: 'FILES.TABS.AUDIO' },
  ];

  /** Library resources (characters/locations/props/audio) NOT yet assigned to
   *  the chapter, grouped by asset type. Assigning one to a ref slot creates a
   *  chapter-character assignment so the reference resolves by name/id. */
  protected readonly libraryByType = computed<Record<AssetType, LibResource[]>>(() => {
    const query = this.libSearch().trim().toLowerCase();
    const assignedIds = this.studio.chapterCharacterIds();
    const buckets: Record<AssetType, LibResource[]> = {
      character: [],
      location: [],
      prop: [],
      audio: [],
    };
    for (const item of this.chars.items()) {
      const c = item.character;
      if (!c?.id || assignedIds.has(c.id)) continue;
      if (query && !c.name.toLowerCase().includes(query)) continue;
      const metadata = parseCharacterMetadata(c.metadata);
      const assetType: AssetType = metadata.assetType ?? 'character';
      (buckets[assetType] ?? buckets.character).push({
        id: c.id,
        name: c.name,
        fileId: item.files?.[0]?.file_id || '',
        kind: metadata.fileKind ?? 'image',
        assetType,
      });
    }
    return buckets;
  });

  /** Library resources for the active tab, sliced to the current page. */
  protected readonly pagedLibrary = computed(() => {
    const all = this.libraryByType()[this.activeLibType()];
    const start = this.libPage() * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });

  protected readonly libTotalPages = computed(() => {
    return Math.max(1, Math.ceil(this.libraryByType()[this.activeLibType()].length / this.pageSize));
  });

  /** Episode resources filtered by search, then sliced to the current page. */
  protected readonly filteredEpisodeResources = computed(() => {
    const query = this.episodeSearch().trim().toLowerCase();
    const all = this.episodeResources();
    if (!query) return all;
    return all.filter((r) => r.name.toLowerCase().includes(query));
  });

  protected readonly pagedEpisodeResources = computed(() => {
    const all = this.filteredEpisodeResources();
    const start = this.episodePage() * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });

  protected readonly episodeTotalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredEpisodeResources().length / this.pageSize));
  });

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

  /** Episode-assigned resources — chapter characters + free assets — ordered by
   *  their [ImageN] slot (slot-less last). Shown together in the "Del episodio"
   *  section so the user can assign a slot from everything the episode carries,
   *  not just the unassigned library. */
  protected readonly episodeResources = computed<EpisodeResource[]>(() => {
    const out: EpisodeResource[] = [];
    for (const c of this.studio.chapterCharacterData()) {
      out.push({
        id: c.id,
        name: c.name,
        fileId: c.fileId,
        slot: c.slot,
        kind: c.kind === 'video' ? 'video' : c.kind === 'audio' ? 'audio' : 'image',
        isCharacter: true,
      });
    }
    for (const a of this.studio.freeAssets()) {
      out.push({
        id: a.id,
        name: a.filename,
        fileId: a.id,
        slot: this.studio.chapterAssetSlots().get(a.id) ?? '',
        kind: a.kind === 'video' ? 'video' : a.kind === 'audio' ? 'audio' : 'image',
        isCharacter: false,
      });
    }
    return out.sort((x, y) => slotNum(x.slot) - slotNum(y.slot));
  });

  /** Assign an episode resource to a ref slot locally — no backend calls.
   *  Replaces the usedAsset file for that slot so the prompt uses the
   *  correct asset, and marks the slot as resolved. */
  protected assignEpisodeResource(r: EpisodeResource, slot: string): void {
    const existing = this.studio.usedAssets().find((a) => a.slot === slot);
    if (existing) {
      this.studio.replaceUsedAsset(existing.fileId, {
        fileId: r.fileId || r.id,
        characterId: r.isCharacter ? r.id : '',
        name: r.name,
        filename: r.name,
        kind: r.kind,
        slot,
      });
    }
    this.markAssigned(slot);
    this.assignPopover.hide();
  }

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
        return this.i18n.instant('STUDIO.SEQUENCE.REF_TYPE_CHARACTER');
      case 'location':
        return this.i18n.instant('STUDIO.SEQUENCE.REF_TYPE_LOCATION');
      case 'prop':
        return this.i18n.instant('STUDIO.SEQUENCE.REF_TYPE_PROP');
      case 'audio':
        return this.i18n.instant('STUDIO.SEQUENCE.REF_TYPE_AUDIO');
      case 'plate':
        return 'plate';
      default:
        return type;
    }
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

  /** Open the assign popover anchored at the given element, targeting the ref's
   *  slot. Public so the viewer can open it from a shot-card ref too. */
  openAssignPopover(event: Event, ref: Reference): void {
    this.assignTarget.set(ref);
    this.assignPopover.toggle(event);
    this.libSearch.set('');
    // Refresh chapter assignments so the library excludes resources already
    // assigned to this chapter — otherwise re-assigning one would fail with a
    // unique-constraint 400 (which, before, was silent because the resolver's
    // own MessageService had no <p-toast> subscribed).
    const projectId = this.projectId() || this.studio.projectId() || '';
    const chapterId = this.chapterId() || this.studio.chapterId() || '';
    if (projectId && chapterId) this.refreshAssignments(projectId, chapterId);
    // Make sure the Characters library is available for the picker. If a
    // search query is active (from another surface) it would narrow the list —
    // clear it to offer the full library.
    if (this.chars.searchQuery()) {
      this.chars.setSearchQuery('');
    } else if (this.chars.items().length === 0 && !this.chars.loading()) {
      this.chars.load().subscribe();
    }
  }

  /** Assign a library resource (character/location/prop/audio) to a reference
   *  slot by creating a chapter-character assignment for it. */
  protected assignLibraryResource(res: LibResource, slot: string): void {
    const projectId = this.projectId() || this.studio.projectId() || '';
    const chapterId = this.chapterId() || this.studio.chapterId() || '';
    if (!projectId || !chapterId || !res.id) return;

    // Replace any existing occupant of the slot (a chapter_character or
    // chapter_asset with that [ImageN] slot), then assign the picked resource.
    this.clearSlot(projectId, chapterId, slot).subscribe({
      next: () => {
        this.projectsApi.assignCharacterToChapter(projectId, chapterId, res.id, slot).subscribe({
          next: (r) => {
            if (r.error) {
              this.toast.add({
                severity: 'error',
                summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSIGN_FAILED'),
                detail: r.msg || this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSIGN_FAILED_DETAIL', { name: res.name, slot }),
              });
              return;
            }
            this.markAssigned(slot);
            this.refreshAssignments(projectId, chapterId);
            this.assignPopover.hide();
            this.toast.add({
              severity: 'success',
              summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_RESOURCE_ASSIGNED'),
              detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_RESOURCE_ASSIGNED_DETAIL', { name: res.name, slot }),
            });
          },
          error: () => {
            this.toast.add({
              severity: 'error',
              summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSIGN_FAILED'),
              detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSIGN_FAILED_DETAIL', { name: res.name, slot }),
            });
          },
        });
      },
      error: () => {
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSIGN_FAILED'),
          detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_SLOT_RELEASE_FAILED', { slot }),
        });
      },
    });
  }

  /** Remove any chapter asset/character that currently occupies the given
   *  [ImageN] slot, so the slot can be reassigned. Completes immediately when
   *  the slot is already free. */
  private clearSlot(projectId: string, chapterId: string, slot: string): Observable<unknown> {
    const removals: Observable<unknown>[] = [];
    for (const [fileId, s] of this.studio.chapterAssetSlots()) {
      if (s === slot) {
        const assignmentId = this.studio.chapterAssetAssignmentIds().get(fileId);
        if (assignmentId) {
          removals.push(this.projectsApi.removeAssetFromChapter(projectId, chapterId, assignmentId));
        }
      }
    }
    for (const c of this.studio.chapterCharacterData()) {
      if (c.slot === slot) {
        const assignmentId = this.studio.chapterCharacterAssignmentIds().get(c.id);
        if (assignmentId) {
          removals.push(
            this.projectsApi.removeCharacterFromChapter(projectId, chapterId, assignmentId),
          );
        }
      }
    }
    return removals.length > 0 ? forkJoin(removals) : of(undefined);
  }

  // ── Reference info popover (metadata of the resolved asset) ────────────

  /** Resolved metadata for a reference, or null when the assetId doesn't match
   *  a chapter character / free asset. */
  protected refInfoFor(ref: Reference): ResolvedRefInfo | null {
    return resolveReferenceInfo(
      ref,
      this.studio.chapterCharacterData(),
      this.studio.freeAssets(),
      this.studio.chapterAssetSlots(),
    );
  }

  /** Reference metadata: by assetId first; falling back to the slot's occupant
   *  when the user explicitly assigned a resource to that slot (the backend
   *  assetId may still not match, so the ref would otherwise look unresolved). */
  protected resolvedInfoFor(ref: Reference): ResolvedRefInfo | null {
    const byAsset = this.refInfoFor(ref);
    if (byAsset) return byAsset;
    if (this.assignedSlots().has(ref.slot)) {
      return resolveReferenceInfoBySlot(
        ref,
        this.studio.chapterCharacterData(),
        this.studio.freeAssets(),
        this.studio.chapterAssetSlots(),
      );
    }
    return null;
  }

  /** Reference shown in the asset-metadata info popover. */
  protected readonly infoTarget = signal<Reference | null>(null);

  @ViewChild('infoPopover') protected readonly infoPopover!: Popover;

  protected openInfoPopover(event: Event, ref: Reference): void {
    this.infoTarget.set(ref);
    this.infoPopover.toggle(event);
  }

  /** File shown in the full-screen viewer (same component as Files / shot builder). */
  protected readonly viewerFile = signal<{ id: string; filename: string; mimeType: string } | null>(null);
  /** Whether the full-screen viewer dialog is open. */
  protected readonly viewerVisible = signal(false);

  /** Open the full-screen viewer for the resolved reference asset. */
  protected openRefViewer(info: ResolvedRefInfo): void {
    if (!info.fileId) return;
    this.viewerFile.set({
      id: info.fileId,
      filename: info.name,
      mimeType:
        info.fileKind === 'video'
          ? 'video/mp4'
          : info.fileKind === 'audio'
            ? 'audio/mpeg'
            : 'image/png',
    });
    this.viewerVisible.set(true);
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
        summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ALREADY_ASSIGNED'),
        detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ALREADY_ASSIGNED_DETAIL', { slot }),
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
              summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSET_ASSIGNED_SUCCESS'),
              detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSET_ASSIGNED_SUCCESS_DETAIL', { fileId, slot }),
            });
          },
          error: () => {
            this.toast.add({
              severity: 'error',
              summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSIGN_FAILED'),
              detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSIGN_ASSET_FAILED', { slot }),
            });
          },
        });
    };

    // Clear any OTHER occupant of the target slot first, then move the picked
    // asset (removing its own old assignment when it has a different slot).
    this.clearSlot(projectId, chapterId, slot).subscribe({
      next: () => {
        if (assignmentId && currentSlot) {
          this.projectsApi.removeAssetFromChapter(projectId, chapterId, assignmentId).subscribe({
            next: () => assign(),
            error: () => assign(),
          });
        } else {
          assign();
        }
      },
      error: () => {
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSIGN_FAILED'),
          detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_SLOT_RELEASE_FAILED', { slot }),
        });
      },
    });
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
          summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_UNSUPPORTED_TYPE'),
          detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_UNSUPPORTED_TYPE_DETAIL'),
        });
        done();
        continue;
      }

      this.filesApi
        .upload({ file: f, category, storage: 'persistent' })
        .subscribe({
          next: (up) => {
            if (up.error || !up.data) {
              this.toast.add({ severity: 'error', summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_UPLOAD_ERROR'), detail: up.msg });
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
                      summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSIGN_FAILED'),
                      detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSIGN_FAILED_DETAIL', { name: f.name, slot }),
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
              summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_UPLOAD_ERROR'),
              detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_UPLOAD_FAILED', { name: f.name }),
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

/** One library resource offered in the assign popover — a character, location,
 *  prop or audio asset from the Characters library. */
interface LibResource {
  /** Character id (what gets assigned to the chapter). */
  id: string;
  name: string;
  /** Primary linked file id (thumbnail preview / the assigned file). */
  fileId: string;
  kind: string;
  assetType: AssetType;
}

/** One episode-assigned resource in the "Del episodio" section — a chapter
 *  character or a free asset, carrying its [ImageN] slot. */
interface EpisodeResource {
  /** Character id (characters) or file id (free assets) — the assign key. */
  id: string;
  name: string;
  /** File id for the thumbnail preview / the assigned file. */
  fileId: string;
  /** [ImageN]/[VideoN]/[AudioN] slot, or '' when the episode has none. */
  slot: string;
  kind: 'image' | 'video' | 'audio';
  isCharacter: boolean;
}

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
