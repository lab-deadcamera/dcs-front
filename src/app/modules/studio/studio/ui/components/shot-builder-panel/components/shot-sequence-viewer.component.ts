import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sequence, Shot, ReferenceType } from '@app/core/interfaces';
import { ShotCardPreviewComponent, beatInfoFromSegments } from './shot-card-preview.component';
import { ShotTimelineStripComponent } from './shot-timeline-strip.component';

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
          {{ sceneName() }}<span class="scene">{{ seq.description }}</span>
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
              ><em>{{ ref.slot }}</em> {{ refNames[ref.assetId] || ref.assetId }} ({{
                refTypeLabel(ref.type)
              }})</span
            >
          }
        </div>
      }

      <!-- Section tag -->
      <div class="section-tag">Planos · ingredientes listados por tarjeta</div>

      <!-- Shot cards -->
      <div class="shots-list">
        @for (shot of seq.shots; track shot.id) {
          <app-shot-card-preview
            [shot]="shot"
            [beat]="beatFor(shot.id, seq)"
            [(approved)]="approvedMap[shot.id]"
            (promptChange)="onPromptChange(shot.id, $event)"
          />
        }
      </div>

      <!-- Note footer -->
      @if (seq.directorNotes?.goal) {
        <div class="note">
          <h3>Cómo usar este pack</h3>
          <p>{{ seq.directorNotes?.goal }}</p>
        </div>
      }

      <footer class="viewer-footer">
        Dead Camera Studios · {{ seq.shots.length }} planos · revisar → cargar refs → pegar idioma →
        generar
      </footer>
    </div>
  `,
  styles: [
    `
      .viewer {
        max-width: 1080px;
        margin: 0 auto;
        padding: 0 clamp(14px, 4vw, 40px) 80px;
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
    `,
  ],
})
export class ShotSequenceViewerComponent {
  readonly sequence = input.required<Sequence>();
  readonly projectName = input<string>('');
  readonly chapterName = input<string>('');
  readonly sceneName = input<string>('');

  /** Mutable map of shot ID → approval status. */
  protected readonly approvedMap: Record<string, boolean> = {};

  protected readonly approvedCount = computed(() => {
    const ids = this.sequence()?.shots.map((s) => s.id) ?? [];
    return ids.filter((id) => this.approvedMap[id]).length;
  });

  /** Human-readable names for reference assetIds */
  protected readonly refNames: Record<string, string> = {
    wyatt: 'Wyatt (gafas)',
    mike: 'Mike',
    'living-room': 'Plate sala',
    'living-room-wallpaper': 'Plate sala c/ papel tapiz',
    'living-room-door': 'Plate sala (puerta)',
  };

  protected readonly slack = computed(() => {
    const seq = this.sequence();
    return Math.max(0, seq.sequenceFlow.duration - seq.duration);
  });

  protected refTypeLabel(type: ReferenceType): string {
    return type === 'character' ? 'personaje' : 'plate';
  }

  protected beatFor(shotId: string, seq: Sequence) {
    return beatInfoFromSegments(shotId, seq.sequenceFlow.segments);
  }

  protected onPromptChange(
    shotId: string,
    change: { lang: 'en' | 'zh'; value: string },
  ): void {
    // Log the change — backends can subscribe to this in the future
    console.log(`[shot-sequence-viewer] Shot ${shotId} ${change.lang} prompt updated`, change.value);
  }

  protected onShotHighlight(shotId: string): void {
    const el = document.getElementById('shot-' + shotId);
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.classList.add('lit');
      setTimeout(() => el.classList.remove('lit'), 1100);
    }
  }
}
