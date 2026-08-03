import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sequence, SequenceScene, Shot, ReferenceType } from '@app/core/interfaces';
import { ShotCardPreviewComponent, beatInfoFromSegments } from './shot-card-preview.component';
import { ShotTimelineStripComponent } from './shot-timeline-strip.component';
import { StudioStore } from '@app/core/stores/studio.store';

@Component({
  selector: 'app-shot-sequence-viewer',
  standalone: true,
  imports: [CommonModule, ShotCardPreviewComponent, ShotTimelineStripComponent],
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

      <!-- References summary -->
      @if (seq.references.length > 0) {
        <div class="section-tag">Referencias @image</div>
        <div class="refs-summary">
          @for (ref of seq.references; track ref.slot) {
            <span class="cut"
              ><em>{{ ref.slot }}</em> {{ refNames()[ref.assetId] || ref.assetId }} ({{
                refTypeLabel(ref.type)
              }})</span
            >
          }
        </div>
      }

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
                    [shot]="shot"
                    [beat]="beatFor(shot.id, seq)"
                    [(approved)]="approvedMap[shot.id]"
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
              [shot]="shot"
              [beat]="beatFor(shot.id, seq)"
              [(approved)]="approvedMap[shot.id]"
              [showChinese]="showChinese()"
              (promptChange)="onPromptChange(shot.id, $event)"
              (langChange)="onLangChange(shot.id, $event)"
            />
          }
        </div>
      }

      <!-- Summary: selected prompt per shot + create button -->
      <div class="summary">
        <div class="section-tag">Resumen de prompts</div>
        <div class="summary-grid">
          @for (shot of seq.shots; track shot.id) {
            <div class="summary-row" [class.summary-approved]="approvedMap[shot.id]">
              <span class="summary-id">
                @if (sceneNumberFor(shot.id); as sceneNum) {
                  <span class="summary-scene">#{{ sceneNum }}</span>
                  <span class="summary-sep">·</span>
                }
                {{ shot.id }}
              </span>
              <span class="summary-title">{{ shot.title }}</span>
              <span class="summary-lang">[{{ langMap[shot.id] || 'en' }}]</span>
              <span class="summary-text">{{ promptPreview(shot) }}</span>
            </div>
          }
        </div>
        <div class="flex w-full justify-end">
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
      .summary-id {
        font-weight: 700;
        color: var(--ink, #ece6d8);
        min-width: 76px;
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

  /** True while the parent is creating scenes/shots from this list — disables
   *  the create button and shows a spinner. */
  readonly creating = input(false);

  /** Mutable map of shot ID → approval status. */
  protected readonly approvedMap: Record<string, boolean> = {};

  /** Map of shot ID → selected language. */
  protected readonly langMap: Record<string, 'en' | 'zh'> = {};

  /** One entry of the list emitted by "Crear listado de pre-prompts". */
  readonly createPrePromptsClicked =
    output<{ sceneNumber: number; shotId: string; lang: 'en' | 'zh'; prompt: string }[]>();

  protected readonly approvedCount = computed(() => {
    const ids = this.sequence()?.shots.map((s) => s.id) ?? [];
    return ids.filter((id) => this.approvedMap[id]).length;
  });

  private readonly studio = inject(StudioStore);

  /**
   * Human-readable names for reference assetIds — resolved from the episode's
   * assigned characters (by character id or file id) and free assets (by file
   * id). Keyed by assetId so the template can look up `refNames[ref.assetId]`.
   */
  protected readonly refNames = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of this.studio.chapterCharacterData()) {
      if (c.id) map[c.id] = c.name;
      if (c.fileId) map[c.fileId] = c.name;
    }
    for (const a of this.studio.freeAssets()) {
      if (a.id) map[a.id] = a.filename;
    }
    return map;
  });

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

  protected onPromptChange(shotId: string, change: { lang: 'en' | 'zh'; value: string }): void {
    // Log the change — backends can subscribe to this in the future
    console.log(
      `[shot-sequence-viewer] Shot ${shotId} ${change.lang} prompt updated`,
      change.value,
    );
  }

  protected onLangChange(shotId: string, lang: 'en' | 'zh'): void {
    this.langMap[shotId] = lang;
  }

  /** Short preview of the prompt text (first N chars). */
  protected promptPreview(shot: Shot): string {
    const lang = this.langMap[shot.id] || 'en';
    const text = lang === 'en' ? shot.prompt.en : shot.prompt.zh;
    if (!text) return '(empty)';
    return text.length > 80 ? text.slice(0, 77) + '…' : text;
  }

  /** Gather all selected prompts and emit them, with the scene each shot
   *  belongs to (0 when the sequence has no per-scene grouping). */
  protected createPrePrompts(): void {
    const seq = this.sequence();
    if (!seq) return;
    const list = seq.shots.map((shot) => {
      const sceneNum = parseInt(this.sceneNumberFor(shot.id), 10);
      return {
        sceneNumber: Number.isFinite(sceneNum) ? sceneNum : 0,
        shotId: shot.id,
        lang: this.langMap[shot.id] || 'en',
        prompt: (this.langMap[shot.id] === 'zh' ? shot.prompt.zh : shot.prompt.en) || '',
      };
    });
    this.createPrePromptsClicked.emit(list);
  }

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
