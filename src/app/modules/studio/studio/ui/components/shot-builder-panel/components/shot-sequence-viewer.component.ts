import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Sequence, SequenceScene, Shot, Reference, ReferenceType } from '@app/core/interfaces';
import { ShotCardPreviewComponent, beatInfoFromSegments } from './shot-card-preview.component';
import { ShotTimelineStripComponent } from './shot-timeline-strip.component';
import { ShotReferenceResolverComponent } from './shot-reference-resolver.component';
import { StudioStore } from '@app/core/stores/studio.store';

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
    DialogModule,
    ButtonModule,
    ShotCardPreviewComponent,
    ShotTimelineStripComponent,
    ShotReferenceResolverComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viewer h-full overflow-y-auto" *ngIf="sequence() as seq">
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
          {{ seq.shots.length }} planos · {{ seq.shots.length }} cortes · duración total
          {{ seq.duration }}s
          @if (approvedCount() > 0) {
            · {{ approvedCount() }}/{{ seq.shots.length }} aprobados
          }
        </p>
        <div class="runline">
          <span class="big">{{ seq.duration }}s</span>
          <span class="cap">/ {{ seq.sequenceFlow.duration }}s tope</span>
          @if (slack() > 0) {
            <span class="slack">+{{ slack() }}s holgura</span>
          }
          <span class="count">· {{ seq.shots.length }} planos</span>
        </div>
      </header>

      <!-- Timeline strip -->
      <app-shot-timeline-strip
        [flow]="seq.sequenceFlow"
        [durationCap]="seq.sequenceFlow.duration"
        (shotHighlight)="onShotHighlight($event)"
      />

      <!-- Meta grid -->
      <div class="meta-grid">
        <div class="card-flat">
          <h3>Convenciones bloqueadas</h3>
          <div class="chips">
            <span class="chip"
              ><b>{{ seq.aspectRatio }}</b> vertical</span
            >
            <span class="chip"
              ><b>{{ seq.sequenceFlow.duration }}s</b> tope</span
            >
            <span class="chip"
              ><b>{{ seq.mode }}</b> narrativo</span
            >
            @if (seq.directorNotes?.styleGuide) {
              <span class="chip rounded-sm!"
                >grade <b>{{ seq.directorNotes!.styleGuide }}</b></span
              >
            }
          </div>
        </div>

        @if (seq.directorNotes?.goal) {
          <div class="card-flat f2f">
            <h3>Objetivo</h3>
            <p>{{ seq.directorNotes!.goal }}</p>
          </div>
        }
      </div>

      @if (seq.directorNotes?.warnings && seq.directorNotes!.warnings!.length > 0) {
        <div class="warnings-block">
          <span class="section-tag">Advertencias</span>
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
      />

      <!-- Section tag -->
      <div class="section-tag">Planos · ingredientes listados por tarjeta</div>

      @if (seq.scenes && seq.scenes.length > 0) {
        <!-- Per-scene accordion -->
        <div class="scenes-accordion">
          @for (scene of seq.scenes; track scene.scriptNumber; let si = $index) {
            @let sceneShots = shotsForScene(scene);
            <details class="scene-block" [open]="si === 0">
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
                    (promptChange)="onPromptChange(shot.id, $event)"
                    (langChange)="onLangChange(shot.id, $event)"
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
              (promptChange)="onPromptChange(shot.id, $event)"
              (langChange)="onLangChange(shot.id, $event)"
            />
          }
        </div>
      }

      <!-- Summary: selected prompt per shot + create button -->
      <div class="summary">
        <div class="section-tag">
          Resumen de prompts
          <span class="summary-approved-count"
            >{{ approvedCount() }}/{{ seq.shots.length }} aprobados</span
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
                [title]="'Go to shot ' + shot.id"
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
              title="Ver los datos exactos (escenas y shots) que se crearían"
            >
              <i class="pi pi-eye" aria-hidden="true"></i>
              Ver datos a crear
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
            {{ creating() ? 'Creando escenas y shots…' : 'Crear listado de pre-prompts' }}
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
      header="Datos que se crearán"
    >
      <div class="flex max-h-[60vh] flex-col gap-3 overflow-y-auto py-2">
        @if (previewScenes().length === 0) {
          <p class="text-[13px] italic text-fg-muted">No hay shots aprobados para crear.</p>
        } @else {
          <p class="text-[13px] font-semibold text-fg">
            {{ previewScenes().length }} escena{{ previewScenes().length !== 1 ? 's' : '' }} y
            {{ previewShotCount() }} shot{{ previewShotCount() !== 1 ? 's' : '' }} se crearían.
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
            label="Cerrar"
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
      header="Sin shots aprobados"
    >
      <div class="flex flex-col gap-3 py-2">
        <p class="text-[13px] leading-relaxed">
          No hay ningún shot marcado como aprobado. Marca al menos un shot como aprobado para crear
          su pre-prompt.
        </p>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end">
          <p-button severity="primary" label="Entendido" (onClick)="noApprovedVisible.set(false)" />
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
      header="Referencias sin resolver"
    >
      <div class="flex flex-col gap-3 py-2">
        <p class="text-[13px] leading-relaxed">
          Hay {{ unresolvedRefs().length }} referencia{{ unresolvedRefs().length !== 1 ? 's' : '' }}
          sin un asset o character relacionado en el episodio:
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
          Puedes asignar un free asset a cada una en la sección "Referencias @image", o continuar de
          todos modos.
        </p>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            label="Cancelar"
            (onClick)="confirmRefsVisible.set(false)"
          />
          <p-button severity="primary" label="Continuar" (onClick)="emitCreatePrePrompts()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      .viewer {
        max-width: 1080px;
        margin: 0 auto;
        padding: 1rem clamp(14px, 4vw, 40px) 40px;
      }

      .viewer-header {
        border-bottom: 1px solid var(--line, #1e3133);
        padding-bottom: 26px;
        margin-bottom: 30px;
      }

      .eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.34em;
        text-transform: uppercase;
        color: var(--teal, #4fb0b5);
        display: flex;
        gap: 14px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }
      .eyebrow .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--amber, #e0a95c);
        box-shadow: 0 0 10px var(--amber, #e0a95c);
      }
      .eyebrow .sep {
        color: var(--ink-faint, #6a7977);
      }

      h1 {
        font-weight: 900;
        font-size: clamp(30px, 6.2vw, 58px);
        line-height: 0.96;
        letter-spacing: -0.02em;
        text-transform: uppercase;
        color: var(--ink, #ece6d8);
      }
      h1 .scene {
        display: block;
        color: var(--amber, #e0a95c);
        font-size: 0.5em;
        letter-spacing: 0.01em;
        margin-top: 10px;
        font-weight: 700;
      }

      .subline {
        color: var(--ink-dim, #9aa6a3);
        margin-top: 14px;
        font-size: 14px;
        max-width: 64ch;
      }
      .runline {
        display: flex;
        gap: 10px;
        align-items: baseline;
        flex-wrap: wrap;
        margin-top: 22px;
        font-family: 'JetBrains Mono', monospace;
      }
      .runline .big {
        font-size: clamp(26px, 5vw, 38px);
        font-weight: 700;
        color: var(--ink, #ece6d8);
      }
      .runline .cap {
        font-size: 15px;
        color: var(--ink-faint, #6a7977);
      }
      .runline .slack {
        font-size: 12px;
        color: var(--teal, #4fb0b5);
        border: 1px solid var(--teal-deep, #2f6e72);
        border-radius: 100px;
        padding: 3px 11px;
        letter-spacing: 0.06em;
      }
      .runline .count {
        font-size: 12px;
        color: var(--ink-dim, #9aa6a3);
        letter-spacing: 0.18em;
        text-transform: uppercase;
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
        background: var(--panel, #121f21);
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        padding: 18px 20px;
      }
      .card-flat h3 {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--teal, #4fb0b5);
        margin-bottom: 14px;
        font-weight: 700;
      }
      .card-flat.f2f {
        border-left: 2px solid var(--ember, #e0653c);
      }
      .card-flat.f2f p {
        font-size: 13.5px;
        color: var(--ink-dim, #9aa6a3);
        line-height: 1.55;
      }
      .card-flat.f2f p b {
        color: var(--ink, #ece6d8);
        font-weight: 600;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }
      .chip {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: var(--ink-dim, #9aa6a3);
        border: 1px solid var(--line, #1e3133);
        background: var(--bg2, #0f1a1c);
        border-radius: 100px;
        padding: 4px 11px;
      }
      .chip b {
        color: var(--ink, #ece6d8);
        font-weight: 500;
      }

      .warnings-block {
        margin: 10px 0;
      }
      .warning-item {
        font-size: 13px;
        color: var(--ink-dim, #9aa6a3);
        padding: 4px 0;
      }

      .refs-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 14px;
      }

      .section-tag {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
        margin: 40px 0 16px;
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .section-tag::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--line, #1e3133);
      }

      .shots-list {
        display: flex;
        flex-direction: column;
      }

      /* ── Per-scene accordion ─────────────────────────────── */
      .scenes-accordion {
        display: flex;
        flex-direction: column;
      }
      .scene-block {
        background: linear-gradient(180deg, var(--panel, #121f21), var(--bg2, #0f1a1c));
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        margin-bottom: 18px;
        overflow: hidden;
        scroll-margin-top: 18px;
      }
      .scene-block[open] .scene-summary {
        border-bottom: 1px solid var(--line, #1e3133);
      }
      .scene-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding: 14px 18px;
        cursor: pointer;
        list-style: none;
        user-select: none;
      }
      .scene-summary::-webkit-details-marker {
        display: none;
      }
      .scene-summary:hover {
        background: rgba(79, 176, 181, 0.05);
      }
      .scene-summary:focus-visible {
        outline: 2px solid var(--teal, #4fb0b5);
        outline-offset: -2px;
      }
      .scene-title {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        min-width: 0;
      }
      .scene-n {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        font-size: 16px;
        line-height: 1;
        color: var(--ink, #ece6d8);
      }
      .scene-loc {
        font-size: 13px;
        color: var(--ink-dim, #9aa6a3);
      }
      .scene-type {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        padding: 3px 8px;
        border-radius: 100px;
        color: #0c1315;
        background: var(--amber, #e0a95c);
        white-space: nowrap;
      }
      .scene-meta {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .scene-dur {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 700;
        color: var(--amber, #e0a95c);
      }
      .scene-count {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
      }
      .scene-chevron {
        color: var(--ink-faint, #6a7977);
        font-size: 12px;
        transition: transform 0.15s ease;
      }
      .scene-block[open] .scene-chevron {
        transform: rotate(180deg);
      }
      .scene-block .shots-list {
        padding: 16px 18px 0;
      }
      .scene-block .shots-list app-shot-card-preview:last-child {
        margin-bottom: 16px;
      }

      .note {
        margin-top: 36px;
        background: var(--panel2, #16282a);
        border: 1px solid var(--line, #1e3133);
        border-left: 2px solid var(--amber, #e0a95c);
        border-radius: 3px;
        padding: 22px clamp(18px, 3vw, 26px);
      }
      .note h3 {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--amber, #e0a95c);
        margin-bottom: 14px;
      }
      .note p {
        font-size: 14px;
        color: var(--ink-dim, #9aa6a3);
        line-height: 1.6;
      }

      .viewer-footer {
        margin-top: 42px;
        text-align: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
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

      /* ── Summary ──────────────────────────────────────── */
      .summary {
        margin-top: 20px;
        border-top: 1px solid var(--line, #1e3133);
        padding-top: 10px;
      }
      .summary-grid {
        display: flex;
        flex-direction: column;
        gap: 0;
        margin-bottom: 22px;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        overflow: hidden;
      }
      .summary-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11.5px;
        border-bottom: 1px solid var(--line, #1e3133);
        background: var(--panel, #121f21);
      }
      .summary-row:last-child {
        border-bottom: none;
      }
      .summary-row.summary-approved {
        background: rgba(95, 185, 143, 0.06);
        border-left: 2px solid #5fb98f;
      }
      .summary-row.summary-unapproved {
        opacity: 0.5;
      }
      .summary-approved-count {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        letter-spacing: 0.1em;
        color: #5fb98f;
        border: 1px solid rgba(95, 185, 143, 0.4);
        border-radius: 100px;
        padding: 2px 10px;
        white-space: nowrap;
      }
      .summary-id {
        display: inline-flex;
        align-items: center;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        font-weight: 700;
        color: var(--ink, #ece6d8);
        min-width: 35px;
        background: none;
        border: none;
        padding: 0;
        text-align: left;
        cursor: pointer;
        transition: color 0.12s ease;
      }
      .summary-id:hover {
        color: var(--teal, #4fb0b5);
        text-decoration: underline;
      }
      .summary-id:focus-visible {
        outline: 2px solid var(--teal, #4fb0b5);
        outline-offset: 2px;
        border-radius: 2px;
      }
      .summary-scene {
        font-weight: 500;
        color: var(--ink-faint, #6a7977);
      }
      .summary-sep {
        color: var(--ink-faint, #6a7977);
        margin: 0 5px;
      }
      .summary-title {
        color: var(--ink-dim, #9aa6a3);
        min-width: 120px;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .summary-lang {
        font-size: 10px;
        letter-spacing: 0.12em;
        color: var(--teal, #4fb0b5);
        min-width: 36px;
        text-transform: uppercase;
      }
      .summary-text {
        flex: 1;
        color: var(--ink-faint, #6a7977);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }
      .create-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        background: var(--teal-deep, #2f6e72);
        color: #eafcfb;
        border: none;
        border-radius: 3px;
        padding: 10px 22px;
        cursor: pointer;
        transition: background 0.16s ease;
      }
      .create-btn:hover {
        background: var(--teal, #4fb0b5);
      }
      .create-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .preview-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        background: transparent;
        color: var(--ink-dim, #9aa6a3);
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        padding: 9px 18px;
        cursor: pointer;
        transition:
          color 0.16s ease,
          border-color 0.16s ease,
          background 0.16s ease;
      }
      .preview-btn:hover:not(:disabled) {
        color: var(--ink, #ece6d8);
        border-color: var(--ink-faint, #6a7977);
        background: rgba(79, 176, 181, 0.05);
      }
      .preview-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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
          sc?.scriptLocation || (num === 0 ? 'Current scene (legacy)' : `Scene ${num}`),
        shots: shots.map((s) => {
          const lang = this.langMap[s.id] || 'en';
          const over = this.promptOverrides()[s.id];
          const prompt = lang === 'zh' ? (over?.zh ?? s.prompt.zh) : (over?.en ?? s.prompt.en);
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
   *  episode assets all carry auto-assigned @imageN slots, which would make
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

  /** Shots of a scene (in order) resolved from the flattened Sequence shots. */
  protected shotsForScene(scene: SequenceScene): Shot[] {
    const all = this.sequence()?.shots ?? [];
    const byId = new Map<string, Shot>(all.map((s) => [s.id, s] as [string, Shot]));
    return (scene.shotIds ?? []).map((id) => byId.get(id)).filter((s): s is Shot => Boolean(s));
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
   *  applied on top of the original. Returns the same reference when there are
   *  no overrides, so OnPush change detection isn't forced unnecessarily. */
  protected shotFor(shot: Shot): Shot {
    const over = this.promptOverrides()[shot.id];
    if (!over) return shot;
    return {
      ...shot,
      prompt: {
        en: over.en ?? shot.prompt.en,
        zh: over.zh ?? shot.prompt.zh,
      },
    };
  }

  /** Short preview of the prompt text (first N chars), honoring edits. */
  protected promptPreview(shot: Shot): string {
    const lang = this.langMap[shot.id] || 'en';
    const over = this.promptOverrides()[shot.id];
    const text = lang === 'zh' ? (over?.zh ?? shot.prompt.zh) : (over?.en ?? shot.prompt.en);
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
      const lang = this.langMap[shot.id] || 'en';
      const over = this.promptOverrides()[shot.id];
      const value =
        (lang === 'zh' ? (over?.zh ?? shot.prompt.zh) : (over?.en ?? shot.prompt.en)) || '';
      const sceneNum = parseInt(this.sceneNumberFor(shot.id), 10);
      return {
        sceneNumber: Number.isFinite(sceneNum) ? sceneNum : 0,
        shotId: shot.id,
        lang,
        prompt: value,
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
