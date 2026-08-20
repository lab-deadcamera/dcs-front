import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Sequence, SequenceScene, Shot, Prompt, Reference, ReferenceType } from '@app/core/interfaces';
import { ShotCardPreviewComponent, beatInfoFromSegments } from './shot-card-preview.component';
import { ShotTimelineStripComponent } from './shot-timeline-strip.component';
import { ShotReferenceResolverComponent } from './shot-reference-resolver.component';
import { StudioStore } from '@app/core/stores/studio.store';
import { replaceSlotToken } from '@app/core/utils/slot-reindex';

/** One shot row of the super-admin preview modal. */
interface PreviewShot {
  id: string;
  title: string;
  lang: 'en' | 'zh';
  prompt: string;
}

/** One scene of the super-admin preview modal (approved shots grouped by scene). */
interface PreviewScene {
  scriptNumber: number;
  scriptLocation: string;
  shots: PreviewShot[];
}

@Component({
  selector: 'app-shot-sequence-viewer',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    ShotCardPreviewComponent,
    ShotTimelineStripComponent,
    ShotReferenceResolverComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viewer h-full overflow-y-auto" *ngIf="sequence() as seq">
      <div class="hazard" aria-hidden="true"></div>
      <!-- Header -->
      <header class="viewer-header">
        <div class="eyebrow">
          <span class="dot"></span>
          {{ projectName() }}
          @if (chapterName()) {
            <span class="sep">·</span>
            <span>EP {{ chapterName() }}</span>
          }
          @if (sceneName()) {
            <span class="sep">·</span>
            <span>{{ sceneName() }}</span>
          }
        </div>
        <h1>
          @if (sceneName()) {
            {{ sceneName() }}<span class="scene">{{ seq.description }}</span>
          } @else {
            {{ seq.description }}
          }
        </h1>
        <p class="subline">
          {{ 'STUDIO.SEQUENCE.HEADER_STATS' | translate: { shots: seq.shots.length, cuts: seq.shots.length, duration: seq.duration } }}
          @if (approvedCount() > 0) {
            · {{ 'STUDIO.SEQUENCE.APPROVED_COUNT' | translate: { n: approvedCount(), total: seq.shots.length } }}
          }
        </p>
        <div class="runline">
          <span class="big">{{ seq.duration }}s</span>
          <span class="cap">{{ 'STUDIO.SEQUENCE.DURATION_CAP' | translate: { duration: seq.sequenceFlow.duration } }}</span>
          @if (slack() > 0) {
            <span class="slack">{{ 'STUDIO.SEQUENCE.SLACK_LABEL' | translate: { slack: slack() } }}</span>
          }
          <span class="count">{{ 'STUDIO.SEQUENCE.SHOTS_COUNT_SUFFIX' | translate: { n: seq.shots.length } }}</span>
        </div>
      </header>

      @if (refineInfo(); as info) {
        <div class="refine-banner">
          <span class="refine-tag">{{ 'STUDIO.SHOT_BUILDER.KIND_REFINED' | translate }}</span>
          <span class="refine-text">{{ info.changeRequest }}</span>
        </div>
      }

      <!-- Timeline strip -->
      <app-shot-timeline-strip
        [flow]="seq.sequenceFlow"
        [durationCap]="seq.sequenceFlow.duration"
        (shotHighlight)="onShotHighlight($event)"
      />

      <!-- Meta grid -->
      <div class="meta-grid">
        <div class="card-flat">
          <h3>{{ 'STUDIO.SEQUENCE.CONVENTIONS' | translate }}</h3>
          <div class="chips">
            <span class="chip"
              ><b>{{ seq.aspectRatio }}</b> {{ 'STUDIO.SEQUENCE.VERTICAL' | translate }}</span
            >
            <span class="chip"
              ><b>{{ seq.sequenceFlow.duration }}s</b> {{ 'STUDIO.SEQUENCE.CAP' | translate }}</span
            >
            <span class="chip"
              ><b>{{ seq.mode }}</b> {{ 'STUDIO.SEQUENCE.NARRATIVE' | translate }}</span
            >
            @if (seq.directorNotes?.styleGuide) {
              <span class="chip rounded-sm!"
                >{{ 'STUDIO.SEQUENCE.GRADE' | translate }} <b>{{ seq.directorNotes!.styleGuide }}</b></span
              >
            }
          </div>
        </div>

        @if (seq.directorNotes?.goal) {
          <div class="card-flat f2f">
            <h3>{{ 'STUDIO.SEQUENCE.GOAL' | translate }}</h3>
            <p>{{ seq.directorNotes!.goal }}</p>
          </div>
        }
      </div>

      @if (seq.directorNotes?.warnings && seq.directorNotes!.warnings!.length > 0) {
        <div class="warnings-block">
          <span class="section-tag">{{ 'STUDIO.SEQUENCE.WARNINGS' | translate }}</span>
          <ul>
            @for (w of seq.directorNotes!.warnings!; track w) {
              <li class="warning-item">{{ w }}</li>
            }
          </ul>
        </div>
      }

      <!-- References summary — detect + resolve missing references -->
      <app-shot-reference-resolver
        [references]="seq.references"
        [unresolved]="unresolvedRefs()"
        [projectId]="projectId()"
        [chapterId]="chapterId()"
        (assignedSlotsChange)="onAssignedSlotsChange($event)"
        (resourceAssigned)="onResourceAssigned($event)"
      />

      <!-- Section tag -->
      <div class="section-tag">{{ 'STUDIO.SEQUENCE.SHOT_LIST_HINT' | translate }}</div>

      @if (seq.scenes && seq.scenes.length > 0) {
        <!-- Per-scene accordion -->
        <div class="scenes-accordion">
          @for (scene of seq.scenes; track scene.scriptNumber; let si = $index) {
            @let sceneShots = shotsForScene(scene);
            <details class="scene-block" [open]="si === 0" [style.--ac]="sceneColorFor(scene)">
              <summary class="scene-summary">
                <div class="scene-title">
                  <span class="scene-n">#{{ scene.scriptNumber }}</span>
                  <span class="scene-loc">{{ scene.scriptLocation }}</span>
                  @if (scene.sceneType && scene.sceneType !== 'present') {
                    <span class="scene-type">{{ scene.sceneType }}</span>
                  }
                </div>
                <div class="scene-meta">
                  <span class="scene-dur">{{ scene.duration }}s</span>
                  <span class="scene-count"
                    >{{ sceneShots.length }} shot{{ sceneShots.length !== 1 ? 's' : '' }}</span
                  >
                  <span class="scene-chevron" aria-hidden="true">▾</span>
                </div>
              </summary>
              <div class="shots-list">
                @for (shot of sceneShots; track shot.id) {
                  <app-shot-card-preview
                    [shot]="shotFor(shot)"
                    [beat]="beatFor(shot.id, seq)"
                    [approved]="approvedMap[shot.id]"
                    (approvedChange)="onApprovedChange(shot.id, $event)"
                    [showChinese]="showChinese()"
                    [assignedSlots]="assignedRefSlots()"
                    (promptChange)="onPromptChange(shot.id, $event)"
                    (langChange)="onLangChange(shot.id, $event)"
                    (refAssign)="onRefAssign($event)"
                  />
                }
              </div>
            </details>
          }
        </div>
      } @else {
        <!-- Flat list fallback (mock / legacy) -->
        <div class="shots-list">
          @for (shot of seq.shots; track shot.id) {
            <app-shot-card-preview
              [shot]="shotFor(shot)"
              [beat]="beatFor(shot.id, seq)"
              [approved]="approvedMap[shot.id]"
              (approvedChange)="onApprovedChange(shot.id, $event)"
              [showChinese]="showChinese()"
              [assignedSlots]="assignedRefSlots()"
              (promptChange)="onPromptChange(shot.id, $event)"
              (langChange)="onLangChange(shot.id, $event)"
              (refAssign)="onRefAssign($event)"
            />
          }
        </div>
      }

      <!-- Summary: selected prompt per shot + create button -->
      <div class="summary">
        <div class="section-tag">
          {{ 'STUDIO.SEQUENCE.PROMPT_SUMMARY' | translate }}
          <span class="summary-approved-count"
            >{{ 'STUDIO.SEQUENCE.APPROVED_COUNT' | translate: { n: approvedCount(), total: seq.shots.length } }}</span
          >
        </div>
        <div class="summary-grid">
          @for (shot of seq.shots; track shot.id) {
            <div
              class="summary-row"
              [class.summary-approved]="approvedMap[shot.id]"
              [class.summary-unapproved]="!approvedMap[shot.id]"
            >
              <button
                type="button"
                class="summary-id"
                (click)="onShotHighlight(shot.id)"
                [title]="'STUDIO.SEQUENCE.GO_TO_SHOT' | translate: { id: shot.id }"
              >
                {{ shot.id }}
              </button>
              <span class="summary-title">{{ shot.title }}</span>
              <span class="summary-lang">[{{ langMap[shot.id] || 'en' }}]</span>
              <span class="summary-text">{{ promptPreview(shot) }}</span>
            </div>
          }
        </div>
        <div class="flex w-full justify-end gap-2">
          @if (isSuperAdmin()) {
            <button
              type="button"
              class="preview-btn"
              (click)="openPreview()"
              [disabled]="creating() || approvedCount() === 0"
              [title]="'STUDIO.SEQUENCE.PREVIEW_TITLE' | translate"
            >
              <i class="pi pi-eye" aria-hidden="true"></i>
              {{ 'STUDIO.SEQUENCE.VIEW_DATA' | translate }}
            </button>
          }
          <button
            type="button"
            class="create-btn"
            (click)="createPrePrompts()"
            [disabled]="creating()"
            [attr.aria-busy]="creating()"
          >
            <i
              class="pi"
              [class.pi-file-export]="!creating()"
              [class.pi-spinner]="creating()"
              [class.pi-spin]="creating()"
              aria-hidden="true"
            ></i>
            {{ creating() ? ('STUDIO.SEQUENCE.CREATING' | translate) : ('STUDIO.SEQUENCE.CREATE_PREPROMPTS' | translate) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Super-admin preview: exact data "Crear listado" would create -->
    <p-dialog
      [visible]="previewVisible()"
      (visibleChange)="previewVisible.set($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '44rem', maxWidth: '95vw' }"
      [header]="'STUDIO.SEQUENCE.PREVIEW_HEADER' | translate"
    >
      <div class="flex max-h-[60vh] flex-col gap-3 overflow-y-auto py-2">
        @if (previewScenes().length === 0) {
          <p class="text-[13px] italic text-fg-muted">{{ 'STUDIO.SEQUENCE.NO_APPROVED_TO_CREATE' | translate }}</p>
        } @else {
          <p class="text-[13px] font-semibold text-fg">
            {{ 'STUDIO.SEQUENCE.SCENES_SHOTS_CREATED' | translate: { scenes: previewScenes().length, shots: previewShotCount() } }}
          </p>
          @for (scene of previewScenes(); track scene.scriptNumber) {
            <div class="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
              <div class="flex items-center justify-between gap-2">
                <span class="min-w-0 text-[12px] font-medium text-fg">
                  #{{ scene.scriptNumber }} — {{ scene.scriptLocation }}
                </span>
                <span class="shrink-0 text-[11px] text-fg-muted">
                  {{ scene.shots.length }} shot{{ scene.shots.length !== 1 ? 's' : '' }}
                </span>
              </div>
              <ul class="mt-1 flex flex-col gap-2">
                @for (s of scene.shots; track s.id) {
                  <li class="flex flex-col gap-0.5 border-t border-ink-800 pt-1.5">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-[10px] font-bold text-fg">{{ s.id }}</span>
                      <span class="min-w-0 flex-1 truncate text-[12px] text-fg">{{ s.title }}</span>
                      <span class="font-mono text-[9px] uppercase text-fg-muted"
                        >[{{ s.lang }}]</span
                      >
                    </div>
                    <p
                      class="break-words whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-fg-muted"
                    >
                      {{ s.prompt }}
                    </p>
                  </li>
                }
              </ul>
            </div>
          }
        }
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CLOSE' | translate"
            (onClick)="previewVisible.set(false)"
          />
        </div>
      </ng-template>
    </p-dialog>

    <!-- No approved shots confirmation -->
    <p-dialog
      [visible]="noApprovedVisible()"
      (visibleChange)="noApprovedVisible.set($event)"
      [modal]="true"
      [closable]="false"
      [draggable]="false"
      [style]="{ width: '30rem', maxWidth: '95vw' }"
      [header]="'STUDIO.SEQUENCE.NO_APPROVED_TITLE' | translate"
    >
      <div class="flex flex-col gap-3 py-2">
        <p class="text-[13px] leading-relaxed">
          {{ 'STUDIO.SEQUENCE.NO_APPROVED_BODY' | translate }}
        </p>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end">
          <p-button severity="primary" [label]="'STUDIO.SEQUENCE.GOT_IT' | translate" (onClick)="noApprovedVisible.set(false)" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Unresolved references confirmation -->
    <p-dialog
      [visible]="confirmRefsVisible()"
      (visibleChange)="confirmRefsVisible.set($event)"
      [modal]="true"
      [closable]="false"
      [draggable]="false"
      [style]="{ width: '38rem', maxWidth: '95vw' }"
      [header]="'STUDIO.SEQUENCE.UNRESOLVED_TITLE' | translate"
    >
      <div class="flex flex-col gap-3 py-2">
        <p class="text-[13px] leading-relaxed">
          {{ 'STUDIO.SEQUENCE.UNRESOLVED_BODY' | translate: { n: unresolvedRefs().length } }}
        </p>
        <ul class="flex flex-col gap-1.5">
          @for (ref of unresolvedRefs(); track ref.slot) {
            <li
              class="rounded-lg border border-red-900/40 bg-red-900/10 px-3 py-2 font-mono text-[12px]"
            >
              <span class="font-bold text-amber-400">{{ ref.slot }}</span>
              <span class="text-fg-muted"> · </span>
              <span class="text-fg">{{ refNameFor(ref) }}</span>
              <span class="text-fg-muted"> ({{ refTypeLabel(ref.type) }})</span>
            </li>
          }
        </ul>
        <p class="text-[12px] leading-relaxed text-fg-muted">
          {{ 'STUDIO.SEQUENCE.UNRESOLVED_HINT' | translate }}
        </p>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CANCEL' | translate"
            (onClick)="confirmRefsVisible.set(false)"
          />
          <p-button severity="primary" [label]="'STUDIO.SEQUENCE.CONTINUE' | translate" (onClick)="emitCreatePrePrompts()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      :host {
        --void: #050505;
        --deep: #0a0a0a;
        --plate: #0d0d0d;
        --plate2: #121212;
        --inset: #080808;
        --line: #242200;
        --line2: #3a3800;
        --ink: #e8e8e0;
        --dim: #8a8a7a;
        --faint: #55554a;
        --hud: #00e0ff;
        --blade: #ff003c;
        --alert: #ff6b1a;
        --acid: #a6ff00;
        --gold: #fcee0a;
        --mono: 'Share Tech Mono', ui-monospace, Menlo, monospace;
        --disp: 'Rajdhani', 'Chakra Petch', ui-sans-serif, system-ui, sans-serif;
        --tech: 'Chakra Petch', 'Share Tech Mono', ui-sans-serif, sans-serif;
        --sk: -11deg;
        display: block;
        color: var(--ink);
        font-family: var(--mono);
        font-size: 14px;
        line-height: 1.62;
        background: radial-gradient(1100px 560px at 12% -10%, rgba(252, 238, 10, 0.07), transparent 60%),
          radial-gradient(900px 480px at 95% 2%, rgba(255, 0, 60, 0.06), transparent 62%),
          linear-gradient(180deg, #080b0e, var(--void) 40%);
      }
      .viewer {
        max-width: 1080px;
        margin: 0 auto;
        padding: 1rem clamp(14px, 4vw, 40px) 40px;
        position: relative;
      }
      .hazard {
        height: 6px;
        margin-bottom: 20px;
        background: repeating-linear-gradient(45deg, var(--gold) 0 9px, #000 9px 18px);
        border-top: 1px solid var(--line2);
      }
      .viewer-header {
        margin-bottom: 26px;
      }
      .eyebrow {
        font-family: var(--tech);
        font-size: 11px;
        letter-spacing: 0.34em;
        text-transform: uppercase;
        color: var(--gold);
        display: flex;
        gap: 14px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .eyebrow .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--gold);
        box-shadow: 0 0 10px var(--gold);
      }
      .eyebrow .sep {
        color: var(--faint);
      }
      h1 {
        font-family: var(--disp);
        font-weight: 700;
        font-size: clamp(32px, 6.4vw, 60px);
        line-height: 0.94;
        letter-spacing: 0.005em;
        text-transform: uppercase;
        color: #eef4f8;
        margin: 0 0 10px;
        transform: skewX(var(--sk));
        transform-origin: left;
        text-shadow: 1.5px 0 var(--hud), -1.5px 0 var(--blade), 0 0 30px rgba(252, 238, 10, 0.25);
      }
      h1 .scene {
        display: block;
        color: var(--dim);
        font-size: 0.46em;
        letter-spacing: 0.03em;
        margin-top: 4px;
        font-weight: 700;
        text-shadow: none;
      }
      .subline {
        font-family: var(--tech);
        font-size: 12.5px;
        color: var(--dim);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin: 0 0 22px;
      }
      .runline {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .runline .big {
        font-family: var(--disp);
        font-weight: 700;
        font-size: 44px;
        line-height: 0.9;
        color: var(--gold);
        text-shadow: 0 0 14px rgba(252, 238, 10, 0.35);
        transform: skewX(var(--sk));
      }
      .runline .cap,
      .runline .slack,
      .runline .count {
        display: inline-flex;
        align-items: center;
        align-self: flex-end;
        margin-bottom: 6px;
        border: 1px solid var(--line2);
        background: linear-gradient(180deg, var(--plate2), var(--plate));
        padding: 5px 13px;
        font-family: var(--tech);
        font-size: 11px;
        letter-spacing: 0.1em;
        color: var(--dim);
        text-transform: uppercase;
      }
      .runline .slack {
        border-color: color-mix(in srgb, var(--hud) 45%, var(--line2));
        color: var(--hud);
      }
      .runline .count {
        color: var(--faint);
      }
      .refine-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        border: 1px solid color-mix(in srgb, #ff1a8c 40%, var(--line2));
        background: linear-gradient(180deg, color-mix(in srgb, #ff1a8c 5%, transparent), transparent 65%);
        border-left: 3px solid #ff1a8c;
        padding: 12px 16px;
        margin-bottom: 24px;
      }
      .refine-tag {
        font-family: var(--tech);
        font-size: 10px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: #ff1a8c;
        white-space: nowrap;
        font-weight: 700;
      }
      .refine-text {
        font-size: 13px;
        color: var(--dim);
        line-height: 1.55;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        margin: 30px 0 6px;
      }
      @media (min-width: 760px) {
        .meta-grid {
          grid-template-columns: 1.35fr 1fr;
        }
      }
      .card-flat {
        position: relative;
        background: linear-gradient(180deg, var(--plate2), var(--plate));
        border: 1px solid var(--line2);
        padding: 18px 20px;
      }
      .card-flat::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(180deg, var(--gold), transparent 74%);
      }
      .card-flat h3 {
        font-family: var(--tech);
        font-size: 11px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: var(--gold);
        margin-bottom: 14px;
        font-weight: 700;
      }
      .card-flat.f2f::before {
        background: linear-gradient(180deg, var(--alert), transparent 74%);
      }
      .card-flat.f2f p {
        font-size: 13.5px;
        color: var(--dim);
        line-height: 1.6;
        margin: 0;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }
      .chip {
        font-family: var(--tech);
        font-size: 11px;
        color: var(--dim);
        border: 1px solid var(--line2);
        background: var(--inset);
        padding: 5px 12px;
        transform: skewX(var(--sk));
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .chip b {
        color: var(--gold);
        font-weight: 600;
      }
      .warnings-block {
        margin: 10px 0 20px;
      }
      .warning-item {
        font-size: 13px;
        color: var(--dim);
        padding: 4px 0;
      }
      .warning-item::marker {
        color: var(--alert);
      }
      .section-tag {
        font-family: var(--tech);
        font-size: 11px;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: var(--gold);
        margin: 40px 0 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        font-weight: 700;
      }
      .section-tag::after {
        content: '';
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, var(--line2), transparent);
      }
      .shots-list {
        display: flex;
        flex-direction: column;
      }
      .scenes-accordion {
        display: flex;
        flex-direction: column;
      }
      .scene-block {
        position: relative;
        margin-bottom: 20px;
        background: var(--plate);
        border: 1px solid var(--line);
        border-radius: 0;
        clip-path: polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 26px 100%, 0 calc(100% - 26px));
        overflow: hidden;
        scroll-margin-top: 18px;
      }
      .scene-block::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: linear-gradient(180deg, var(--ac, var(--gold)), transparent 74%);
        z-index: 1;
      }
      .scene-block[open] .scene-summary {
        border-bottom: 1px solid var(--line);
      }
      .scene-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding: 15px 20px;
        cursor: pointer;
        list-style: none;
        user-select: none;
      }
      .scene-summary::-webkit-details-marker {
        display: none;
      }
      .scene-summary:hover {
        background: rgba(252, 238, 10, 0.04);
      }
      .scene-summary:focus-visible {
        outline: 2px solid var(--ac, var(--gold));
        outline-offset: -2px;
      }
      .scene-title {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        min-width: 0;
      }
      .scene-n {
        font-family: var(--disp);
        font-weight: 700;
        font-size: 22px;
        line-height: 1;
        color: var(--ac, var(--gold));
        transform: skewX(var(--sk));
        transform-origin: left;
      }
      .scene-loc {
        font-family: var(--tech);
        font-size: 12px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--dim);
      }
      .scene-type {
        font-family: var(--tech);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        padding: 3px 9px;
        color: #06080a;
        background: var(--ac, var(--gold));
        white-space: nowrap;
      }
      .scene-meta {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .scene-dur {
        font-family: var(--disp);
        font-size: 20px;
        font-weight: 700;
        color: var(--ac, var(--gold));
      }
      .scene-count {
        font-family: var(--tech);
        font-size: 10.5px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--faint);
      }
      .scene-chevron {
        color: var(--faint);
        font-size: 12px;
        transition: transform 0.15s ease;
      }
      .scene-block[open] .scene-chevron {
        transform: rotate(180deg);
      }
      .scene-block .shots-list {
        padding: 18px 20px 0;
      }
      .scene-block .shots-list app-shot-card-preview:last-child {
        margin-bottom: 18px;
      }
      .note {
        margin-top: 36px;
        background: var(--plate);
        border: 1px solid var(--line);
        border-left: 2px solid var(--gold);
        padding: 22px clamp(18px, 3vw, 26px);
      }
      .note h3 {
        font-family: var(--tech);
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--gold);
        margin-bottom: 14px;
      }
      .note p {
        font-size: 14px;
        color: var(--dim);
        line-height: 1.6;
      }
      .viewer-footer {
        margin-top: 42px;
        text-align: center;
        font-family: var(--tech);
        font-size: 11px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--faint);
      }
      .cut {
        font-family: var(--tech);
        font-size: 11px;
        color: var(--ink);
        background: var(--inset);
        border: 1px solid var(--line2);
        padding: 3px 9px;
      }
      .cut em {
        color: var(--gold);
        font-style: normal;
        font-weight: 700;
      }
      .summary {
        margin-top: 24px;
        border-top: 1px solid var(--line);
        padding-top: 12px;
      }
      .summary-grid {
        display: flex;
        flex-direction: column;
        gap: 0;
        margin-bottom: 22px;
        border: 1px solid var(--line2);
        background: var(--inset);
      }
      .summary-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        font-family: var(--mono);
        font-size: 11.5px;
        border-bottom: 1px solid var(--line);
        background: var(--plate);
      }
      .summary-row:last-child {
        border-bottom: none;
      }
      .summary-row.summary-approved {
        background: rgba(166, 255, 0, 0.06);
        border-left: 2px solid var(--acid);
      }
      .summary-row.summary-unapproved {
        opacity: 0.5;
      }
      .summary-approved-count {
        font-family: var(--tech);
        font-size: 10.5px;
        letter-spacing: 0.1em;
        color: var(--acid);
        border: 1px solid color-mix(in srgb, var(--acid) 40%, transparent);
        padding: 2px 10px;
        white-space: nowrap;
        text-transform: uppercase;
      }
      .summary-id {
        display: inline-flex;
        align-items: center;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        font-weight: 700;
        color: var(--gold);
        min-width: 35px;
        background: none;
        border: none;
        padding: 0;
        text-align: left;
        cursor: pointer;
        transition: color 0.12s ease;
      }
      .summary-id:hover {
        color: var(--hud);
        text-decoration: underline;
      }
      .summary-id:focus-visible {
        outline: 2px solid var(--hud);
        outline-offset: 2px;
      }
      .summary-scene {
        font-weight: 500;
        color: var(--faint);
      }
      .summary-sep {
        color: var(--faint);
        margin: 0 5px;
      }
      .summary-title {
        color: var(--dim);
        min-width: 120px;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .summary-lang {
        font-size: 10px;
        letter-spacing: 0.12em;
        color: var(--hud);
        min-width: 36px;
        text-transform: uppercase;
      }
      .summary-text {
        flex: 1;
        color: var(--faint);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }
      .create-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: var(--tech);
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 700;
        background: linear-gradient(180deg, var(--plate2), var(--plate));
        color: var(--ink);
        border: 2px solid var(--gold);
        padding: 11px 22px;
        cursor: pointer;
        transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
      }
      .create-btn:hover:not(:disabled) {
        background: var(--gold);
        color: #06080a;
        box-shadow: 0 0 16px rgba(252, 238, 10, 0.4);
      }
      .create-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .preview-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: var(--tech);
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        background: transparent;
        color: var(--dim);
        border: 1px solid var(--line2);
        padding: 10px 18px;
        cursor: pointer;
        transition: color 0.16s ease, border-color 0.16s ease;
      }
      .preview-btn:hover:not(:disabled) {
        color: var(--ink);
        border-color: var(--hud);
      }
      .preview-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      @media (max-width: 700px) {
        h1 {
          transform: none;
        }
        .runline .big {
          transform: none;
        }
        .chip,
        .scene-n {
          transform: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
          animation: none !important;
        }
      }
    `,
  ],
})
export class ShotSequenceViewerComponent {
  readonly sequence = input.required<Sequence>();
  readonly projectName = input<string>('');
  readonly chapterName = input<string>('');
  readonly sceneName = input<string>('');
  /** Whether to show the Chinese language toggle on shot cards. */
  readonly showChinese = input(true);
  /** Project/chapter ids — passed to the reference resolver so it can assign
   *  free assets to the episode's chapter. Falls back to the studio store. */
  readonly projectId = input<string>('');
  readonly chapterId = input<string>('');

  /** True while the parent is creating scenes/shots from this list — disables
   *  the create button and shows a spinner. */
  readonly creating = input(false);

  /** When the current sequence came from a refine, shows the change request
   *  that was applied (anti-drift banner). Null for fresh generations. */
  readonly refineInfo = input<{ changeRequest: string } | null>(null);

  /** Super admins get a preview of the exact data "Crear listado" would create. */
  readonly isSuperAdmin = input(false);

  /** Mutable map of shot ID → approval status. */
  protected readonly approvedMap: Record<string, boolean> = {};

  /** Bumped every time an approval changes, so computeds that depend on
   *  approvedMap (a plain object) stay reactive. */
  private readonly approvedTick = signal(0);

  /** Map of shot ID → selected language. */
  protected readonly langMap: Record<string, 'en' | 'zh'> = {};

  /** Edits made by double-clicking a shot prompt, keyed by shot id and lang —
   *  kept in the viewer so the change is reflected in the card, the summary
   *  and the emitted pre-prompts (previously onPromptChange only logged). */
  protected readonly promptOverrides = signal<Record<string, { en?: string; zh?: string }>>({});

  /** One entry of the list emitted by "Crear listado de pre-prompts". */
  readonly createPrePromptsClicked =
    output<{ sceneNumber: number; shotId: string; lang: 'en' | 'zh'; prompt: string }[]>();

  protected readonly approvedCount = computed(() => {
    this.approvedTick();
    const ids = this.sequence()?.shots.map((s) => s.id) ?? [];
    return ids.filter((id) => this.approvedMap[id]).length;
  });

  /** Shots marked as approved — only these are created by "Crear listado". */
  protected readonly approvedShots = computed<Shot[]>(() => {
    this.approvedTick();
    const seq = this.sequence();
    if (!seq) return [];
    return seq.shots.filter((s) => this.approvedMap[s.id]);
  });

  // ── Super-admin preview of the data "Crear listado" would create ────

  /** Visibility of the super-admin preview modal. */
  protected readonly previewVisible = signal(false);

  /** The approved shots grouped by scene (with location + prompt) exactly as
   *  "Crear listado de pre-prompts" would create them. Reactive to approval
   *  changes because it derives from approvedShots(). */
  protected readonly previewScenes = computed<PreviewScene[]>(() => {
    const seq = this.sequence();
    if (!seq) return [];
    const sceneInfo = new Map<number, SequenceScene>();
    for (const sc of seq.scenes ?? []) sceneInfo.set(sc.scriptNumber, sc);

    const groups = new Map<number, Shot[]>();
    for (const shot of this.approvedShots()) {
      const n = parseInt(this.sceneNumberFor(shot.id), 10);
      const key = Number.isFinite(n) ? n : 0;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(shot);
    }

    const scenes: PreviewScene[] = [];
    for (const [num, shots] of groups) {
      const sc = sceneInfo.get(num);
      scenes.push({
        scriptNumber: num,
        scriptLocation:
          sc?.scriptLocation ||
          (num === 0
            ? this.i18n.instant('STUDIO.SEQUENCE.CURRENT_SCENE_LEGACY')
            : this.i18n.instant('STUDIO.SEQUENCE.SCENE_FALLBACK', { num })),
        shots: shots.map((s) => {
          const derived = this.shotFor(s);
          const lang = this.langMap[s.id] || 'en';
          const prompt = lang === 'zh' ? derived.prompt.zh : derived.prompt.en;
          return { id: s.id, title: s.title, lang, prompt: prompt || '' };
        }),
      });
    }
    return scenes;
  });

  /** Total approved shots across all preview scenes. */
  protected readonly previewShotCount = computed(() =>
    this.previewScenes().reduce((n, sc) => n + sc.shots.length, 0),
  );

  /** Open the super-admin preview modal (no-op for non admins). */
  protected openPreview(): void {
    if (!this.isSuperAdmin()) return;
    this.previewVisible.set(true);
  }

  private readonly studio = inject(StudioStore);
  private readonly i18n = inject(TranslateService);

  /**
   * Human-readable names for reference assetIds — resolved from the episode's
   * assigned characters and free assets. The backend may emit a reference's
   * assetId as the character/asset id OR its name/filename (the prompt example
   * uses "name_of_asset" for locations), so every key is matched
   * case-insensitively by id, file id, name and filename. Lookups in the
   * template and in isRefResolved use ref.assetId.toLowerCase().
   */
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

  /** Slots the reference resolver has assigned a free asset to — those
   *  references stop counting as unresolved even when the assetId placeholder
   *  from the backend still doesn't match. */
  protected readonly assignedRefSlots = signal<Set<string>>(new Set());

  protected onAssignedSlotsChange(slots: Set<string>): void {
    this.assignedRefSlots.set(slots);
  }

  /** The reference resolver — its assign popover also serves the shot cards. */
  @ViewChild(ShotReferenceResolverComponent)
  protected readonly refResolver!: ShotReferenceResolverComponent;

  /** A shot-card ref requested to assign a resource to its slot — open the
   *  shared resolver's assign popover anchored at the card's "+" button. */
  protected onRefAssign(payload: { event: Event; ref: Reference; shotId: string }): void {
    this.pendingRefShotId = payload.shotId;
    this.refResolver?.openAssignPopover(payload.event, payload.ref);
  }

  /** Track which shot the user is assigning a resource for so the
   *  resourceAssigned handler can update the correct reference. */
  private pendingRefShotId = '';

  /** When the resolver picks an episode resource for a ref slot, update the
   *  corresponding shot's reference assetId locally (no backend call). */
  protected onResourceAssigned(payload: {
    ref: Reference;
    resource: { id: string; name: string; slot?: string };
  }): void {
    const shotId = this.pendingRefShotId;
    if (!shotId) return;
    this.refOverrides.update((map) => {
      const cur = map[shotId] || {};
      return { ...map, [shotId]: { ...cur, [payload.ref.slot]: payload.resource.id } };
    });
    // If the picked episode resource carries its own slot, that slot replaces
    // the ref's current one — both in the refs and in the pre-prompt tokens.
    const newSlot = payload.resource.slot;
    if (newSlot && newSlot !== payload.ref.slot) {
      this.slotOverrides.update((map) => {
        const cur = map[shotId] || {};
        return { ...map, [shotId]: { ...cur, [payload.ref.slot]: newSlot } };
      });
    }
  }

  /** Per-shot reference assetId overrides — keyed by shotId then by slot. */
  protected readonly refOverrides = signal<Record<string, Record<string, string>>>({});

  /** Per-shot reference slot overrides — keyed by shotId then by the ORIGINAL
   *  slot, mapping to the slot the selected episode resource carries. Applied
   *  to both the refs and the pre-prompt text. */
  protected readonly slotOverrides = signal<Record<string, Record<string, string>>>({});

  /** UNIQUE source of truth for unresolved references: every reference of the
   *  sequence with no related asset/character in the episode, excluding slots
   *  the user has already assigned via the resolver. Drives BOTH the resolver's
   *  highlighting and the create-pre-prompts validation, so they never diverge. */
  protected readonly unresolvedRefs = computed<Reference[]>(() => {
    const seq = this.sequence();
    if (!seq) return [];
    return seq.references.filter(
      (r) => !this.isRefResolved(r) && !this.assignedRefSlots().has(r.slot),
    );
  });

  /** True when a reference is resolved: its assetId matches a known character
   *  or free asset in the episode. (Slot-occupancy alone does NOT resolve it —
   *  episode assets all carry auto-assigned [ImageN] slots, which would make
   *  every reference look resolved.) */
  /** Normalized lookup key for an assetId (trimmed, lowercased). */
  private refKey(assetId: string | undefined): string {
    return assetId ? assetId.trim().toLowerCase() : '';
  }

  /** Display name for a reference, resolved case-insensitively by id, file id,
   *  name or filename; falls back to the raw assetId. */
  protected refNameFor(ref: Reference): string {
    return this.refNames()[this.refKey(ref.assetId)] || ref.assetId;
  }

  protected isRefResolved(ref: Reference): boolean {
    return Boolean(this.refNames()[this.refKey(ref.assetId)]);
  }

  /** Visibility of the "continuar de todos modos" dialog when creating
   *  pre-prompts with unresolved references. */
  protected readonly confirmRefsVisible = signal(false);

  /** Visibility of the "no shots approved" dialog. */
  protected readonly noApprovedVisible = signal(false);

  protected readonly slack = computed(() => {
    const seq = this.sequence();
    return Math.max(0, seq.sequenceFlow.duration - seq.duration);
  });

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

  /** Shots of a scene (in order) resolved from the flattened Sequence shots. */
  protected shotsForScene(scene: SequenceScene): Shot[] {
    const all = this.sequence()?.shots ?? [];
    const byId = new Map<string, Shot>(all.map((s) => [s.id, s] as [string, Shot]));
    return (scene.shotIds ?? []).map((id) => byId.get(id)).filter((s): s is Shot => Boolean(s));
  }

  /** The scene's accent color, taken from its shot's timeline segment so the
   *  scene block shares the exact color the timeline strip assigns it. */
  protected sceneColorFor(scene: SequenceScene): string {
    const segments = this.sequence()?.sequenceFlow.segments ?? [];
    const ids = new Set(scene.shotIds ?? []);
    const seg = segments.find((s) => ids.has(s.shotId));
    return seg?.color || '#fcee0a';
  }

  /** Scene number (scriptNumber) that owns the given shot id, or '' when the
   *  sequence has no per-scene grouping (flat mock / legacy). */
  protected sceneNumberFor(shotId: string): string {
    const scenes = this.sequence()?.scenes ?? [];
    for (const scene of scenes) {
      if (scene.shotIds?.includes(shotId)) return String(scene.scriptNumber);
    }
    return '';
  }

  protected beatFor(shotId: string, seq: Sequence) {
    return beatInfoFromSegments(shotId, seq.sequenceFlow.segments);
  }

  /** Persist a prompt edit (double-click) so it stays visible in the card and
   *  is used when creating the pre-prompts. */
  protected onPromptChange(shotId: string, change: { lang: 'en' | 'zh'; value: string }): void {
    this.promptOverrides.update((map) => {
      const cur = map[shotId] || {};
      return { ...map, [shotId]: { ...cur, [change.lang]: change.value } };
    });
  }

  /** Record an approval toggle and bump the reactive tick. */
  protected onApprovedChange(shotId: string, value: boolean): void {
    this.approvedMap[shotId] = value;
    this.approvedTick.update((n) => n + 1);
  }

  protected onLangChange(shotId: string, lang: 'en' | 'zh'): void {
    this.langMap[shotId] = lang;
  }

  /** The shot as the card should render it — with any user prompt edits
   *  applied on top of the original, plus reference re-assignments (new
   *  assetId and, for episode picks, a new slot whose token is rewritten in
   *  the prompt text). Returns the same reference when there are no overrides,
   *  so OnPush change detection isn't forced unnecessarily. */
  protected shotFor(shot: Shot): Shot {
    const over = this.promptOverrides()[shot.id];
    const refOver = this.refOverrides()[shot.id];
    const slotOver = this.slotOverrides()[shot.id];
    if (!over && !refOver && !slotOver) return shot;

    let prompt: Prompt = shot.prompt;
    if (over) {
      prompt = { en: over.en ?? shot.prompt.en, zh: over.zh ?? shot.prompt.zh };
    }
    if (slotOver) {
      let en = prompt.en;
      let zh = prompt.zh ?? '';
      for (const [oldSlot, newSlot] of Object.entries(slotOver)) {
        en = replaceSlotToken(en, oldSlot, newSlot);
        zh = replaceSlotToken(zh, oldSlot, newSlot);
      }
      prompt = { en, zh };
    }

    const result: Shot = prompt !== shot.prompt ? { ...shot, prompt } : shot;
    if (refOver || slotOver) {
      result.references = shot.references.map((r) => {
        let ref = r;
        const newAssetId = refOver?.[r.slot];
        if (newAssetId) ref = { ...ref, assetId: newAssetId };
        const newSlot = slotOver?.[r.slot];
        if (newSlot) ref = { ...ref, slot: newSlot };
        return ref;
      });
    }
    return result;
  }

  /** Short preview of the prompt text (first N chars), honoring edits and
   *  reference re-assignments. */
  protected promptPreview(shot: Shot): string {
    const lang = this.langMap[shot.id] || 'en';
    const derived = this.shotFor(shot);
    const text = lang === 'zh' ? derived.prompt.zh : derived.prompt.en;
    if (!text) return '(empty)';
    return text.length > 80 ? text.slice(0, 77) + '…' : text;
  }

  /** Create the pre-prompts for the APPROVED shots only. If none are approved,
   *  show a message; if there are unresolved references (the single
   *  unresolvedRefs source), ask first. */
  protected createPrePrompts(): void {
    if (this.approvedShots().length === 0) {
      this.noApprovedVisible.set(true);
      return;
    }
    if (this.unresolvedRefs().length > 0) {
      this.confirmRefsVisible.set(true);
      return;
    }
    this.emitCreatePrePrompts();
  }

  /** Emit the pre-prompt list (called directly, or after "Continuar" in the
   *  unresolved-references confirmation dialog). Only approved shots are
   *  included, with their edited prompts. */
  protected emitCreatePrePrompts(): void {
    this.confirmRefsVisible.set(false);
    const shots = this.approvedShots();
    if (shots.length === 0) return;
    const list = shots.map((shot) => {
      const derived = this.shotFor(shot);
      const lang = this.langMap[shot.id] || 'en';
      const value = lang === 'zh' ? derived.prompt.zh : derived.prompt.en;
      const sceneNum = parseInt(this.sceneNumberFor(shot.id), 10);
      return {
        sceneNumber: Number.isFinite(sceneNum) ? sceneNum : 0,
        shotId: shot.id,
        lang,
        prompt: value || '',
      };
    });
    this.createPrePromptsClicked.emit(list);
  }

  /** Discard prompt edits when a new sequence arrives (fresh generation). */
  private readonly resetOverridesOnSequence = effect(() => {
    this.sequence();
    this.promptOverrides.set({});
  });

  protected onShotHighlight(shotId: string): void {
    const el = document.getElementById('shot-' + shotId);
    if (el) {
      // Open the containing scene accordion so the shot card is visible.
      const details = el.closest('details') as HTMLDetailsElement | null;
      if (details && !details.open) details.open = true;
      el.scrollIntoView({ block: 'center' });
      el.classList.add('lit');
      setTimeout(() => el.classList.remove('lit'), 1100);
    }
  }
}
