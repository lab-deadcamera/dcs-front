import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { HeroComponent } from '@shared/components/hero/hero.component';
import { ViewerComponent } from '@shared/components/viewer/viewer.component';
import { PromptBuilderComponent } from '@shared/components/prompt-builder/prompt-builder.component';
import { SessionReelComponent } from '@shared/components/session-reel/session-reel.component';
import { CinematographyComponent } from '@shared/components/cinematography/cinematography.component';
import { OutputFormatComponent } from '@shared/components/output-format/output-format.component';
import { CharacterAssetsComponent } from '@shared/components/character-assets/character-assets.component';
import { RatingComponent } from '@shared/components/rating/rating.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { SessionGateDialogComponent } from '@shared/components/session-gate-dialog/session-gate-dialog.component';
import { TakeChecklistComponent } from '@shared/components/take-checklist/take-checklist.component';
import { MAX_BATCH_COUNT, PromptStateService } from '@app/core/stores/prompt.state';
import { StudioStateService } from '@app/core/stores/studio.state';
import { SessionStateService } from '@app/core/stores/session.state';
import { AssetsStateService } from '@app/core/stores/assets.state';
import { ModelService, SeedanceService } from '@app/services';
import {
  GeneratedClip,
  StudioContentItem,
  StudioGenerateRequest,
  StudioTaskResponse,
} from '@app/core/interfaces';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

/** Visual progress per status — backend reports no % during running, so we fake it. */
const PROGRESS_QUEUED = 10;
const PROGRESS_RUNNING_START = 30;
const PROGRESS_RUNNING_STEP = 10;
const PROGRESS_RUNNING_CAP = 85;

/** Backend polling cadence per the studio-generation use-case doc. */
const POLL_INTERVAL_MS = 3000;

@Component({
  selector: 'app-index-studio',
  imports: [
    HeroComponent,
    ViewerComponent,
    PromptBuilderComponent,
    SessionReelComponent,
    CinematographyComponent,
    OutputFormatComponent,
    CharacterAssetsComponent,
    RatingComponent,
    ToastModule,
    FooterComponent,
    SessionGateDialogComponent,
    TakeChecklistComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './index-studio.html',
  styleUrl: './index-studio.css',
  providers: [ConfirmationService, MessageService],
})
export class IndexStudio implements OnInit {
  protected readonly prompt = inject(PromptStateService);
  protected readonly session = inject(SessionStateService);
  private readonly studioState = inject(StudioStateService); // StudioStateService
  private readonly assets = inject(AssetsStateService);
  private readonly modelService = inject(ModelService);
  private readonly seedance = inject(SeedanceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(MessageService);

  /**
   * Two-way binding for the gate dialog. Auto-opens when no session is
   * loaded — closing happens from inside the dialog after a successful
   * submit (or via the parent if we later add a "switch scene" affordance).
   */
  protected readonly gateOpen = signal(false);
  protected readonly scenePrefix = computed(() => this.session.scene()?.code ?? '');

  ngOnInit(): void {
    this.modelService.getFavorite().subscribe((res) => {
      if (!res.error && res.data) {
        this.studioState.setModelCode(res.data);
      }
    });
    // Open the gate immediately if there's no persisted session. Hydrate is
    // async, so wait a tick before checking — otherwise we'd flash the gate
    // even for returning users whose session is being read from IndexedDB.
    queueMicrotask(() => {
      if (!this.session.isReady()) this.gateOpen.set(true);
    });
  }

  /** Forwarded from the take-checklist's `(toggle)` output. */
  protected onToggleTake(takeIndex: number): void {
    this.session.toggleTake(takeIndex);
  }

  /**
   * Dispatch one independent generation request per `batchCount`. Each
   * request gets its own backend task id, pending-task entry, and 3s
   * polling loop so the viewer can render individual progress rings for
   * the batch.
   */
  protected onGenerate(): void {
    const text = this.prompt.rawDescription().trim();
    if (!text) {
      this.toast.add({
        summary: 'Error',
        detail: 'Debes escribir un prompt antes de generar',
        severity: 'error',
        life: 3000,
      });
      return;
    }
    const count = Math.max(1, Math.min(MAX_BATCH_COUNT, this.prompt.output().batchCount || 1));
    for (let i = 0; i < count; i++) {
      this.runOneGeneration(text, i + 1, count);
    }
  }

  /**
   * Submit one task to the studio API and follow its lifecycle:
   *   1. POST /studio/generate           — registers task, returns taskId
   *   2. GET  /studio/status/{taskId}    — every 3s until succeeded/failed
   *   3. On succeed → pushClip; on fail → drop the pending entry.
   *
   * Progress is faked locally because the backend only reports a status
   * enum (queued/running/succeeded/failed), not a percentage.
   */
  private runOneGeneration(prompt: string, index: number, total: number): void {
    const label = total > 1 ? `${index}/${total}` : undefined;
    const takeIndex = this.session.currentTake()?.index;
    const localId = this.prompt.startGeneration(label, takeIndex);

    if (!this.studioState.modelCode()) {
      this.toast.add({
        summary: 'Error',
        detail: 'Debes seleccionar un modelo',
        severity: 'error',
        life: 3000,
      });
      return;
    }

    // Capture the source snapshot at submit time so the resulting clip can
    // be "reused" later even if the user has since edited the editor.
    const source = this.buildSourceSnapshot(prompt);
    const payload = this.buildPayload(prompt);

    this.seedance
      .generate(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        console.log({ res });

        this.toast.add({
          summary: 'Respuesta del servidor',
          detail: res.msg,
          severity: res.error ? 'error' : 'success',
          life: 7000,
        });
        if (res.error || !res.data) {
          this.prompt.failGeneration(localId);
          return;
        }
        const initial = res.data;
        if (initial.status === 'succeeded') {
          this.finishWithClip(localId, initial, source);
          return;
        }
        if (initial.status === 'failed') {
          this.prompt.failGeneration(localId);
          return;
        }
        // Async path: kick off the polling loop.
        this.prompt.updateGenerationProgress(
          localId,
          initial.status === 'running' ? PROGRESS_RUNNING_START : PROGRESS_QUEUED,
        );
        this.pollUntilTerminal(initial.taskId, localId, source);
      });
  }

  /**
   * Poll `/studio/status/{taskId}` every 3 seconds until the task reaches
   * a terminal state. The `takeWhile(..., inclusive=true)` makes sure the
   * terminal response is delivered to the subscriber before the stream
   * completes, so we always see the final outputs[] or the failure flag.
   */
  private pollUntilTerminal(
    taskId: string,
    localId: string,
    source: GeneratedClip['source'],
  ): void {
    let pollCount = 0;
    interval(POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.seedance.status(taskId)),
        takeWhile(
          (res) =>
            !res.error &&
            !!res.data &&
            (res.data.status === 'queued' || res.data.status === 'running'),
          true,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res.error || !res.data) {
          this.prompt.failGeneration(localId);
          this.toast.add({
            summary: 'Error de generación',
            detail: res.msg || 'Error al consultar el estado de la tarea',
            severity: 'error',
            life: 5000,
          });
          return;
        }
        const task = res.data;
        pollCount += 1;
        if (task.status === 'running') {
          const next = Math.min(
            PROGRESS_RUNNING_CAP,
            PROGRESS_RUNNING_START + pollCount * PROGRESS_RUNNING_STEP,
          );
          this.prompt.updateGenerationProgress(localId, next);
        } else if (task.status === 'succeeded') {
          this.finishWithClip(localId, task, source);
        } else if (task.status === 'failed') {
          this.prompt.failGeneration(localId);
          this.toast.add({
            summary: 'Generación fallida',
            detail: 'La tarea no pudo completarse',
            severity: 'error',
            life: 5000,
          });
        }
      });
  }

  /**
   * Materialize a `GeneratedClip` from the first video output and hand it
   * to the prompt store so it surfaces in the viewer + session reel. If
   * the backend reports `succeeded` without any outputs, treat it as a
   * failure rather than push a broken clip.
   */
  private finishWithClip(
    localId: string,
    task: StudioTaskResponse,
    source: GeneratedClip['source'],
  ): void {
    const out = task.outputs.find((o) => o.type === 'video') ?? task.outputs[0];
    if (!out?.url) {
      this.prompt.failGeneration(localId);
      this.toast.add({
        summary: 'Error',
        detail: 'No se recibió un video del servidor',
        severity: 'error',
        life: 5000,
      });
      return;
    }
    const output = this.prompt.output();
    const clip: GeneratedClip = {
      id: crypto.randomUUID(),
      prompt: this.prompt.rawDescription(),
      videoUrl: out.url,
      createdAt: Date.now(),
      durationSeconds: output.durationSeconds,
      resolution: output.resolution,
      source,
    };
    this.prompt.completeGeneration(localId, clip);
    this.toast.add({
      summary: 'Generación completada',
      detail: 'El video se ha generado correctamente',
      severity: 'success',
      life: 5000,
    });
  }

  /**
   * Build the request body from the current prompt + output + assets state.
   *
   * References come from two sources: the drop-zone slots (first/last/free
   * via AssetsStateService) and the Characters library quick-pick (via
   * PromptStateService.usedAssets). Both are flattened into a single
   * deduped `content[]` array — drop-zone slots first because their order
   * carries semantic meaning ("Image 1" = first frame).
   */
  private buildPayload(text: string): StudioGenerateRequest {
    const output = this.prompt.output();
    const refs = this.collectReferenceAssets();
    const hints = this.buildFrameHints();
    const finalText = hints ? `${hints} ${text}` : text;

    const content: StudioContentItem[] = [{ type: 'text', text: finalText }];
    for (const ref of refs) {
      content.push({
        type: ref.type,
        id: ref.fileId,
        name: ref.filename,
        text: ref.tag,
      });
    }

    return {
      model: this.studioState.modelCode()?.name ?? '',
      content,
      ratio: output.aspectRatio,
      duration: output.durationSeconds,
      camerafixed: false,
      seed: '',
      quality: 'standard',
      quantity: 1,
      watermark: false,
      resolution: output.resolution,
      generate_audio: output.sound,
      image_mode: 'PIL',
    };
  }

  /**
   * Auto-generated text prepended to the prompt so the model knows which
   * reference image anchors the first/last frame of the video. Order
   * mirrors `collectReferenceAssets`: first-frame is always Image 1; if
   * a last-frame is set without a first-frame, it stands alone as Image 1.
   */
  private buildFrameHints(): string {
    const first = this.assets.firstFrame();
    const last = this.assets.lastFrame();
    if (first && last) return 'The video starts on Image 1 and ends on Image 2.';
    if (first) return 'The video starts on Image 1.';
    if (last) return 'The video ends on Image 1.';
    return '';
  }

  /**
   * Flatten every reference source into a single deduped list:
   *   1. Drop-zone first frame
   *   2. Drop-zone last frame
   *   3. Drop-zone free assets (in user-added order)
   *   4. Characters library picks (in click order)
   * Order matters because BytePlus references images positionally
   * ("Image 1" = first item with `type: 'image'`).
   */
  private collectReferenceAssets(): Array<{
    fileId: string;
    filename: string;
    type: 'image' | 'video' | 'audio';
    tag: string;
  }> {
    const out: Array<{
      fileId: string;
      filename: string;
      type: 'image' | 'video' | 'audio';
      tag: string;
    }> = [];
    const seen = new Set<string>();
    const push = (
      fileId: string,
      filename: string,
      type: 'image' | 'video' | 'audio',
      tag: string,
    ): void => {
      if (seen.has(fileId)) return;
      seen.add(fileId);
      out.push({ fileId, filename, type, tag });
    };

    const first = this.assets.firstFrame();
    if (first) push(first.id, first.filename, first.kind, first.tag || 'First Frame');
    const last = this.assets.lastFrame();
    if (last) push(last.id, last.filename, last.kind, last.tag || 'Last Frame');
    for (const free of this.assets.freeAssets()) {
      push(free.id, free.filename, free.kind, free.tag);
    }
    for (const used of this.prompt.usedAssets()) {
      const type: 'image' | 'video' | 'audio' = used.kind === 'mixed' ? 'image' : used.kind;
      push(used.fileId, used.filename, type, used.name);
    }
    return out;
  }

  /** Snapshot of the editor inputs at submit time — drives "reuse prompt". */
  private buildSourceSnapshot(compiled: string): GeneratedClip['source'] {
    return {
      rawDescription: compiled,
      cinematography: this.prompt.cinematography(),
      output: this.prompt.output(),
      assets: {
        firstFrame: this.assets.firstFrame(),
        lastFrame: this.assets.lastFrame(),
        free: this.assets.freeAssets(),
      },
    };
  }
}
