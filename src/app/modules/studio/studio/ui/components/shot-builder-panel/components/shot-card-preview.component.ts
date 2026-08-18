import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Popover } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { Reference, Shot } from '@app/core/interfaces';
import { StudioStore } from '@app/core/stores/studio.store';
import { SourceAssetPipe, SourceThumbnailAssetPipe } from '@app/core/pipes';
import { ResolvedRefInfo, resolveReferenceInfo, resolveReferenceInfoBySlot } from '@app/shared/utils';
import { AssetViewerComponent } from '@shared/components/asset-viewer/asset-viewer.component';

export interface BeatInfo {
  label: string;
  color: string;
  varColor: string;
}

const BEAT_MAP: Record<string, BeatInfo> = {
  HOOK: { label: 'HOOK', color: '#3d8b8f', varColor: 'var(--hook)' },
  FRICTION: { label: 'FRICTION', color: '#c98a3c', varColor: 'var(--friction)' },
  SPIKE: { label: 'SPIKE', color: '#e0653c', varColor: 'var(--spike)' },
  BUTTON: { label: 'BUTTON', color: '#5e7073', varColor: 'var(--button)' },
};

/**
 * Resolve beat info from a shot ID by looking at the sequence flow segments.
 * Falls back to SPIKE if no segment matches.
 */
export function beatInfoFromSegments(
  shotId: string,
  segments: Array<{ id: string; label: string; color?: string }>,
): BeatInfo {
  const seg = segments.find((s) => s.id === shotId);
  if (seg) {
    return {
      label: seg.label.toUpperCase(),
      color: seg.color || '#5e7073',
      varColor: seg.color || '#5e7073',
    };
  }
  return BEAT_MAP['BUTTON'];
}

@Component({
  selector: 'app-shot-card-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    Popover,
    TooltipModule,
    SourceAssetPipe,
    SourceThumbnailAssetPipe,
    AssetViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="shot-card"
      [class.approved]="approved()"
      [id]="'shot-' + shot().id"
      [style]="{ '--beat': beat().varColor }"
    >
      <!-- Top row: ID · title · beat tag · duration -->
      <div class="shot-top">
        <div class="shot-n">{{ shot().id }}</div>
        <div class="shot-head">
          <div class="shot-title">{{ shot().title }}</div>
          @if (shot().camera) {
            <div class="shot-meta">{{ shot().camera.framing }} · {{ shot().camera.lens }}</div>
          }
        </div>
        <div class="shot-side">
          <span class="beat-tag" [style]="{ background: beat().color }">
            {{ beat().label }}
          </span>
          <span class="dur">{{ shot().duration }}s</span>
        </div>
      </div>

      <!-- Director guide -->
      <div class="guide">
        <div class="gl">{{ 'STUDIO.SEQUENCE.DIRECTOR_GUIDE' | translate }}</div>

        @if (shot().description) {
          <div class="grow">
            <span class="k">{{ 'STUDIO.SEQUENCE.SCENE_LABEL' | translate }}</span>
            <span class="v">{{ shot().description }}</span>
          </div>
        }

        <div class="grow">
          <span class="k">{{ 'STUDIO.SHOT_BUILDER.COL_DURATION' | translate }}</span>
          <span class="v"
            ><b>{{ shot().duration }}s</b></span
          >
        </div>

        @if (shot().camera) {
          @if (shot().camera.framing) {
            <div class="grow">
              <span class="k">{{ 'STUDIO.SEQUENCE.TYPE' | translate }}</span>
              <span class="v">{{ shot().camera.framing }}</span>
            </div>
          }

          @if (shot().camera.movement) {
            <div class="grow">
              <span class="k">{{ 'STUDIO.SHOT_BUILDER.COL_CAMERA' | translate }}</span>
              <span class="v">{{ shot().camera.movement }} · {{ shot().camera.lens }}</span>
            </div>
          }

          @if (shot().camera.lens) {
            <div class="grow">
              <span class="k">{{ 'STUDIO.SEQUENCE.LENS' | translate }}</span>
              <span class="v">{{ shot().camera.lens }}</span>
            </div>
          }
        }

        @if (shot().composition.frameMap) {
          <div class="grow">
            <span class="k">{{ 'STUDIO.SEQUENCE.FRAME_MAP' | translate }}</span>
            <span class="v">{{ shot().composition.frameMap }}</span>
          </div>
        }

        @let warnings = shot().notes.warnings;
        @if (warnings && warnings.length > 0) {
          <div class="grow">
            <span class="k">{{ 'STUDIO.SEQUENCE.WARNINGS' | translate }}</span>
            <span class="v">
              <ul class="warning-list">
                @for (w of warnings; track w) {
                  <li>{{ w }}</li>
                }
              </ul>
            </span>
          </div>
        }

        @let watchFor = shot().notes.watchFor;
        @if (watchFor && watchFor.length > 0) {
          <div class="grow">
            <span class="k">{{ 'STUDIO.SEQUENCE.WATCH_FOR' | translate }}</span>
            <span class="v">
              <ul class="warning-list">
                @for (w of watchFor; track w) {
                  <li>{{ w }}</li>
                }
              </ul>
            </span>
          </div>
        }

        @let todos = shot().notes.todos;
        @if (todos && todos.length > 0) {
          <div class="grow">
            <span class="k">{{ 'STUDIO.SEQUENCE.INGREDIENTS' | translate }}</span>
            <span class="v">
              <div class="cuts">
                @for (todo of todos; track todo; let i = $index) {
                  <span class="cut"
                    ><em>[Image{{ i + 1 }}]</em> {{ todo }}</span
                  >
                }
              </div>
            </span>
          </div>
        }

        @if (shot().references.length > 0) {
          <div class="grow">
            <span class="k">{{ 'STUDIO.SEQUENCE.REFS' | translate }}</span>
            <span class="v">
              <div class="cuts">
                @for (ref of shot().references; track ref.slot) {
                  @let refInfo = resolvedInfoFor(ref);
                  <span class="ref-chip-wrap">
                    <button
                      type="button"
                      class="cut ref-chip-button"
                      (click)="openRefInfo($event, ref)"
                      [title]="'Ver metadata del asset'"
                      ><em>{{ ref.slot }}</em> {{ ref.type }}</button
                    >
                    @if (refInfo) {
                      <button
                        type="button"
                        class="ref-chip-reassign"
                        (click)="onRefAssign($event, ref)"
                        [pTooltip]="'STUDIO.SHOT_BUILDER.CHANGE_ASSIGNED_RESOURCE' | translate"
                        tooltipPosition="top"
                        [attr.aria-label]="'STUDIO.SHOT_BUILDER.CHANGE_ASSIGNED_RESOURCE' | translate"
                      >
                        <i class="pi pi-refresh" aria-hidden="true"></i>
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="ref-chip-assign"
                        (click)="onRefAssign($event, ref)"
                        [pTooltip]="'STUDIO.SHOT_BUILDER.ASSIGN_FREE_ASSET' | translate"
                        tooltipPosition="top"
                        [attr.aria-label]="'STUDIO.SHOT_BUILDER.ASSIGN_FREE_ASSET' | translate"
                      >
                        <i class="pi pi-plus" aria-hidden="true"></i>
                      </button>
                    }
                  </span>
                }
              </div>
            </span>
          </div>
        }

        @if (shot().acting && shot().acting.dialogue) {
          <div class="grow">
            <span class="k">{{ 'STUDIO.SEQUENCE.DIALOGUE' | translate }}</span>
            <span class="v b"
              ><em>{{ shot().acting.dialogue }}</em></span
            >
          </div>
        }
      </div>

      <!-- Approval checkbox -->
      <div class="approval-bar">
        <label class="approval-label">
          <input
            type="checkbox"
            class="approval-check"
            [checked]="approved()"
            (change)="onApprovedChange($event)"
          />
          <span class="approval-text" [class.approved]="approved()">
            {{ approved() ? ('STUDIO.SEQUENCE.APPROVED' | translate) : ('STUDIO.SEQUENCE.MARK_APPROVED' | translate) }}
          </span>
        </label>
      </div>

      <!-- Prompt section (editable) -->
      <div class="prompt">
        <div class="prompt-bar">
          <span class="pl">{{ 'STUDIO.SEQUENCE.PRE_PROMPT' | translate }}</span>

          @if (shot().prompt.zh) {
            <div class="toggle" role="group" [attr.aria-label]="'STUDIO.SEQUENCE.PROMPT_LANG_ARIA' | translate">
              <button
                class="toggle-btn"
                [class.on]="lang() === 'en'"
                [attr.aria-pressed]="lang() === 'en'"
                (click)="onToggleLang('en')"
              >
                EN
              </button>
              @if (showChinese()) {
                <button
                  class="toggle-btn"
                  [class.on]="lang() === 'zh'"
                  [attr.aria-pressed]="lang() === 'zh'"
                  (click)="onToggleLang('zh')"
                >
                  中文
                </button>
              }
            </div>
          }

          <span
            class="counter"
            [class.warn]="charCount() > LIMIT * 0.92"
            [class.bad]="charCount() > LIMIT"
          >
            {{ lang() === 'en' ? 'EN' : '中文' }}
            {{ charCount() | number }} / {{ LIMIT | number }}
          </span>
          <button
            class="copy-btn"
            [class.done]="copied()"
            (click)="copyPrompt()"
            [attr.aria-label]="'STUDIO.SEQUENCE.COPY_PROMPT_ARIA' | translate"
          >
            {{ copied() ? ('STUDIO.SEQUENCE.COPIED' | translate) : ('STUDIO.SEQUENCE.COPY' | translate) }}
          </button>
        </div>
        @if (editing()) {
          <textarea
            class="body editor"
            [class.zh]="lang() === 'zh'"
            [value]="currentPrompt()"
            (input)="onPromptEdit($event)"
            (blur)="onPromptBlur()"
            rows="6"
            [attr.aria-label]="'STUDIO.SEQUENCE.EDIT_PROMPT_ARIA' | translate"
          ></textarea>
          <div class="edit-actions">
            <button class="done-btn" (click)="doneEditing()">{{ 'COMMON.DONE' | translate }}</button>
          </div>
        } @else {
          <pre
            class="body"
            [class.zh]="lang() === 'zh'"
            (dblclick)="startEditing()"
            role="button"
            tabindex="0"
            (keydown.enter)="startEditing()"
            >{{ currentPrompt() }}</pre
          >
          <span class="edit-hint">{{ 'STUDIO.SEQUENCE.DOUBLE_CLICK_EDIT' | translate }}</span>
        }
      </div>

      <!-- Ref info popover — metadata of the resolved asset -->
      <p-popover #refInfoPopover [dismissable]="true" styleClass="asset-popover-z">
        @if (refInfoTarget(); as ref) {
          <div class="ref-info">
            <p class="ref-info-title">{{ ref.slot }} · {{ refTypeLabel(ref.type) }}</p>

            @if (resolvedInfoFor(ref); as info) {
              @if (info.fileKind === 'image' && info.fileId) {
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
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 18px;
      }

      .shot-card {
        background: linear-gradient(180deg, var(--panel, #121f21), var(--bg2, #0f1a1c));
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        position: relative;
        overflow: hidden;
        transition:
          border-color 0.18s ease,
          box-shadow 0.18s ease;
      }
      .shot-card.lit {
        border-color: var(--ink-faint, #6a7977);
        box-shadow: 0 0 0 1px var(--ink-faint, #6a7977);
      }
      .shot-card::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: var(--beat, var(--teal, #4fb0b5));
        z-index: 1;
      }

      .shot-top {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
        padding: 20px clamp(16px, 3vw, 26px) 0;
      }
      .shot-n {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        font-size: 30px;
        line-height: 1;
        color: var(--ink, #ece6d8);
        min-width: 44px;
        letter-spacing: -0.03em;
      }
      .shot-head {
        flex: 1;
        min-width: 200px;
      }
      .shot-title {
        font-weight: 800;
        font-size: 18px;
        letter-spacing: -0.01em;
        color: var(--ink, #ece6d8);
        line-height: 1.2;
      }
      .shot-meta {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: var(--ink-dim, #9aa6a3);
        margin-top: 6px;
      }
      .shot-side {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }
      .beat-tag {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        padding: 5px 10px;
        border-radius: 100px;
        color: #0c1315;
        white-space: nowrap;
      }
      .dur {
        font-family: 'JetBrains Mono', monospace;
        font-size: 20px;
        font-weight: 700;
        color: var(--amber, #e0a95c);
      }

      .guide {
        margin: 18px clamp(16px, 3vw, 26px) 0;
        background: rgba(79, 176, 181, 0.05);
        border: 1px solid rgba(79, 176, 181, 0.18);
        border-left: 2px solid var(--teal, #4fb0b5);
        border-radius: 3px;
        padding: 15px 17px;
      }
      .guide .gl {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--teal, #4fb0b5);
        margin-bottom: 11px;
      }
      .guide .gl::after {
        content: ' para ti';
        color: var(--ink-faint, #6a7977);
        letter-spacing: 0.12em;
      }
      .grow {
        display: flex;
        gap: 10px;
        font-size: 13.5px;
        line-height: 1.5;
        padding: 4px 0;
        border-bottom: 1px solid rgba(30, 49, 51, 0.5);
      }
      .grow:last-child {
        border-bottom: none;
      }
      .grow .k {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
        min-width: 78px;
        flex: 0 0 78px;
        padding-top: 2px;
      }
      .grow .v {
        color: var(--ink-dim, #9aa6a3);
        flex: 1;
      }
      .grow .v b,
      .grow .v em {
        color: var(--ink, #ece6d8);
        font-weight: 600;
        font-style: normal;
      }
      .grow .v .approve-badge {
        color: #5fb98f;
        font-weight: 600;
      }

      .approval-bar {
        margin: 14px clamp(16px, 3vw, 26px) 0;
        display: flex;
        align-items: center;
      }
      .approval-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        user-select: none;
      }
      .approval-check {
        width: 18px;
        height: 18px;
        accent-color: #5fb98f;
        cursor: pointer;
      }
      .approval-text {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: var(--ink-dim, #9aa6a3);
        letter-spacing: 0.04em;
      }
      .approval-text.approved {
        color: #5fb98f;
        font-weight: 700;
      }

      /* Green shadow when approved */
      .shot-card.approved {
        box-shadow: 1px 4px 9px 1px rgba(95, 185, 143, 0.45);
      }

      .warning-list {
        margin: 0;
        padding-left: 16px;
        list-style-type: disc;
      }

      .cuts {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .cut {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--ink, #ece6d8);
        background: var(--bg2, #0f1a1c);
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        padding: 3px 9px;
      }
      .cut em {
        color: var(--amber, #e0a95c);
        font-style: normal;
        font-weight: 700;
      }
      .ref-chip-button {
        cursor: pointer;
        transition: border-color 0.15s ease;
      }
      .ref-chip-button:hover {
        border-color: var(--teal, #4fb0b5);
      }
      .ref-chip-wrap {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .ref-chip-assign {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border: 1px solid rgba(224, 101, 60, 0.6);
        border-radius: 50%;
        background: transparent;
        color: #e0653c;
        cursor: pointer;
        font-size: 9px;
        padding: 0;
        transition: all 0.15s ease;
      }
      .ref-chip-assign:hover {
        background: #e0653c;
        color: #0c1315;
      }
      .ref-chip-reassign {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border: 1px solid rgba(79, 176, 181, 0.6);
        border-radius: 50%;
        background: transparent;
        color: var(--teal, #4fb0b5);
        cursor: pointer;
        font-size: 9px;
        padding: 0;
        transition: all 0.15s ease;
      }
      .ref-chip-reassign:hover {
        background: var(--teal, #4fb0b5);
        color: #0c1315;
      }

      /* Ref info popover */
      .ref-info {
        width: 300px;
        padding: 14px;
        background: var(--panel, #121f21);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ref-info-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: var(--ink-dim, #9aa6a3);
        margin: 0;
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

      .prompt {
        margin: 18px clamp(16px, 3vw, 26px) 22px;
      }
      .prompt-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }
      .pl {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--amber, #e0a95c);
      }
      .toggle {
        display: inline-flex;
        border: 1px solid var(--line, #1e3133);
        border-radius: 100px;
        overflow: hidden;
      }
      .toggle-btn {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.06em;
        background: transparent;
        color: var(--ink-dim, #9aa6a3);
        border: none;
        padding: 6px 15px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .toggle-btn.on {
        background: var(--teal-deep, #2f6e72);
        color: #eafcfb;
      }
      .counter {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #5fb98f;
        margin-left: auto;
        letter-spacing: 0.04em;
      }
      .counter.warn {
        color: var(--warn, #e0a95c);
      }
      .counter.bad {
        color: var(--bad, #e0653c);
      }
      .copy-btn {
        background: transparent;
        border: 1px solid var(--line, #1e3133);
        color: var(--ink-dim, #9aa6a3);
        border-radius: 3px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 6px 11px;
        cursor: pointer;
        transition: all 0.16s ease;
      }
      .copy-btn:hover {
        border-color: var(--teal-deep, #2f6e72);
        color: var(--teal, #4fb0b5);
      }
      .copy-btn.done {
        border-color: var(--teal, #4fb0b5);
        color: var(--teal, #4fb0b5);
      }

      pre.body {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        line-height: 1.62;
        color: #d3d8d4;
        background: #0a1011;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        padding: 16px 17px;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 340px;
        overflow: auto;
        margin: 0;
      }
      pre.body.zh {
        font-family: 'Noto Sans SC', 'JetBrains Mono', monospace;
        font-size: 13px;
        line-height: 1.7;
      }
      pre.body::-webkit-scrollbar {
        width: 9px;
      }
      pre.body::-webkit-scrollbar-thumb {
        background: var(--line, #1e3133);
        border-radius: 9px;
      }
      pre.body:focus {
        outline: 2px solid var(--teal-deep, #2f6e72);
        outline-offset: -2px;
      }

      textarea.body.editor {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        line-height: 1.62;
        color: #d3d8d4;
        background: #0a1011;
        border: 1px solid var(--teal-deep, #2f6e72);
        border-radius: 3px;
        padding: 16px 17px;
        width: 100%;
        box-sizing: border-box;
        resize: vertical;
        min-height: 120px;
      }
      textarea.body.editor.zh {
        font-family: 'Noto Sans SC', 'JetBrains Mono', monospace;
        font-size: 13px;
        line-height: 1.7;
      }
      textarea.body.editor:focus {
        outline: none;
        border-color: var(--teal, #4fb0b5);
      }

      .edit-hint {
        display: block;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.12em;
        color: var(--ink-faint, #6a7977);
        text-align: right;
        margin-top: 4px;
      }
      .edit-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 6px;
      }
      .done-btn {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.08em;
        background: var(--teal-deep, #2f6e72);
        color: #eafcfb;
        border: none;
        border-radius: 3px;
        padding: 5px 14px;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .done-btn:hover {
        background: var(--teal, #4fb0b5);
      }
    `,
  ],
})
export class ShotCardPreviewComponent {
  readonly LIMIT = 3500;

  readonly shot = input.required<Shot>();
  readonly beat = input.required<BeatInfo>();
  /** When true, show the Chinese (中文) language toggle. */
  readonly showChinese = input(true);
  /** [ImageN] slots the user has explicitly assigned a resource to (via the
   *  reference resolver) — refs with these slots count as resolved even when
   *  their backend assetId doesn't match the assigned resource. */
  readonly assignedSlots = input<Set<string>>(new Set());

  /** Two-way model for approval status. */
  readonly approved = model(false);

  /** Output emitted when editing a prompt is finished. */
  readonly promptChange = output<{ lang: 'en' | 'zh'; value: string }>();
  /** Output emitted when the language toggle changes. */
  readonly langChange = output<'en' | 'zh'>();
  /** Emitted when the user clicks "+" on an unresolved ref to assign a resource
   *  to its slot — the viewer forwards it to the shared resolver popover. */
  readonly refAssign = output<{ event: Event; ref: Reference }>();

  private readonly studio = inject(StudioStore);
  private readonly i18n = inject(TranslateService);

  // ── Reference info popover (metadata of the resolved asset) ────────────

  /** Reference shown in the ref info popover. */
  protected readonly refInfoTarget = signal<Reference | null>(null);
  @ViewChild('refInfoPopover') protected readonly refInfoPopover!: Popover;

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

  /** Human label for a reference's semantic type. */
  protected refTypeLabel(type: string): string {
    switch (type) {
      case 'character':
        return this.i18n.instant('STUDIO.SHOT_BUILDER.REF_TYPE_CHARACTER');
      case 'location':
        return this.i18n.instant('STUDIO.SHOT_BUILDER.REF_TYPE_LOCATION');
      case 'prop':
        return this.i18n.instant('STUDIO.SHOT_BUILDER.REF_TYPE_PROP');
      default:
        return type;
    }
  }

  /** Resolved metadata for a shot reference, or null when it doesn't match a
   *  chapter character / free asset. */
  protected refInfoFor(ref: Reference): ResolvedRefInfo | null {
    return resolveReferenceInfo(
      ref,
      this.studio.chapterCharacterData(),
      this.studio.freeAssets(),
      this.studio.chapterAssetSlots(),
    );
  }

  /** Reference metadata: by assetId first; falling back to the slot's occupant
   *  when the user explicitly assigned a resource to that slot. */
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

  protected openRefInfo(event: Event, ref: Reference): void {
    this.refInfoTarget.set(ref);
    this.refInfoPopover.toggle(event);
  }

  /** Request an assignment for an unresolved ref slot (forwards to the viewer,
   *  which opens the shared resolver's assign popover). */
  protected onRefAssign(event: Event, ref: Reference): void {
    event.stopPropagation();
    this.refAssign.emit({ event, ref });
  }

  readonly lang = signal<'en' | 'zh'>('en');
  readonly copied = signal(false);
  readonly editing = signal(false);
  /** Buffer while editing — avoids emitting on every keystroke. */
  private editBuffer = '';

  readonly currentPrompt = computed(() => {
    const s = this.shot();
    return (this.lang() === 'en' ? s.prompt.en : s.prompt.zh) || '';
  });

  readonly charCount = computed(() => this.currentPrompt().length);

  constructor() {
    // Emit initial lang
    queueMicrotask(() => this.langChange.emit(this.lang()));
  }

  protected onToggleLang(lang: 'en' | 'zh'): void {
    this.lang.set(lang);
    this.langChange.emit(lang);
  }

  copyPrompt(): void {
    const text = this.currentPrompt();
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1400);
      })
      .catch(() => {
        // fallback: no clipboard
      });
  }

  // ── Approval ─────────────────────────────────────────────────

  onApprovedChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.approved.set(checked);
  }

  // ── Prompt editing ────────────────────────────────────────────

  startEditing(): void {
    this.editBuffer = this.currentPrompt();
    this.editing.set(true);
  }

  onPromptEdit(event: Event): void {
    this.editBuffer = (event.target as HTMLTextAreaElement).value;
  }

  onPromptBlur(): void {
    // Don't commit on blur — user may tab to "Hecho" button
  }

  doneEditing(): void {
    const lang = this.lang();
    if (this.editBuffer !== this.currentPrompt()) {
      this.promptChange.emit({ lang, value: this.editBuffer });
    }
    this.editing.set(false);
  }
}
