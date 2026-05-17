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
import { TakesReelComponent } from '@shared/components/takes-reel/takes-reel.component';
import { CinematographyComponent } from '@shared/components/cinematography/cinematography.component';
import { OutputFormatComponent } from '@shared/components/output-format/output-format.component';
import { CharacterAssetsComponent } from '@shared/components/character-assets/character-assets.component';
import { RatingComponent } from '@shared/components/rating/rating.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { SessionGateDialogComponent } from '@shared/components/session-gate-dialog/session-gate-dialog.component';
import { SessionStore } from '@app/core/stores/session.store';
import { TakeChecklistComponent } from '@shared/components/take-checklist/take-checklist.component';
import { MAX_BATCH_COUNT } from '@core/interfaces/studio.models';
import { StudioStore } from '@app/core/stores/studio.store';
import { ModelService, SeedanceService } from '@app/services';
import { ProjectsApiService } from '@modules/projects/projects/services';
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
    TakesReelComponent,
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
  protected readonly studio = inject(StudioStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly modelService = inject(ModelService);
  private readonly seedance = inject(SeedanceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(MessageService);
  private readonly projectsApi = inject(ProjectsApiService);

  /**
   * Two-way binding for the gate dialog. Auto-opens when no session is
   * loaded — closing happens from inside the dialog after a successful
   * submit (or via the parent if we later add a "switch scene" affordance).
   */
  protected readonly gateOpen = signal(false);
  protected readonly scenePrefix = computed(() => this.studio.sceneCode());

  /** True when the current take already has a video (re-generation mode). */
  protected readonly isRegenerating = this.studio.currentTakeHasVideo;

  /** Admins (level ≤ 1) pueden cerrar el gate sin seleccionar proyecto/escena. */
  protected readonly canBypassGate = computed(() => this.sessionStore.roleLevel() <= 1);

  ngOnInit(): void {
    this.modelService.getFavorite().subscribe((res) => {
      if (!res.error && res.data) {
        this.studio.model = res.data;
      }
    });
    // Open the gate immediately if there's no persisted session. Hydrate is
    // async, so wait a tick before checking — otherwise we'd flash the gate
    // even for returning users whose session is being read from IndexedDB.
    queueMicrotask(() => {
      if (!this.studio.isReady()) this.gateOpen.set(true);
      // Intenta recuperar generaciones que quedaron en curso tras una recarga.
      this.restorePendingTasks();
    });
  }

  /**
   * Recupera el estado de generaciones desde dos fuentes:
   *   1. Pending tasks hidratadas desde IndexedDB (re-poll status).
   *   2. Backend generation_logs filtrados por proyecto/escena (completados).
   */
  private restorePendingTasks(): void {
    const pending = this.studio.pendingGenerations();
    const projectId = this.studio.projectId();
    const sceneId = this.studio.sceneId();

    // 1. Re-poll tasks que estaban en curso antes de la recarga
    for (const p of pending) {
      if (!p.taskId) continue;
      this.seedance.status(p.taskId).subscribe((res) => {
        if (res.error || !res.data) {
          this.studio.failGeneration(p.id);
          return;
        }
        const task = res.data;
        const source = p.takeIndex != null
          ? { rawDescription: '', cinematography: {} as any, output: {} as any }
          : undefined;
        if (task.status === 'succeeded') {
          this.finishWithClip(p.id, task, source as any);
        } else if (task.status === 'failed') {
          this.studio.failGeneration(p.id);
          this.toast.add({
            summary: 'Generación recuperada',
            detail: `Take ${p.takeIndex ?? '?'} falló antes de la recarga`,
            severity: 'warn',
            life: 5000,
          });
        } else {
          // Todavía en progreso — reanudar polling
          const modelName = this.studio.modelCode()?.name ?? '';
          this.studio.restorePendingTask(p.id, p.taskId, modelName);
          this.studio.updateGenerationProgress(p.id, 30);
          this.pollUntilTerminal(p.taskId, p.id, source as any);
        }
      });
    }

    // 2. Consultar logs del backend para el proyecto/escena actual y
    //    asegurar que ningún clip completado se perdió en el olvido.
    if (!projectId || !sceneId) return;

    this.seedance.getLogs({ project_id: projectId, scene_id: sceneId, limit: 50 }).subscribe((res) => {
      if (res.error || !res.data) return;
      const existingUrls = new Set(this.studio.sessionClips().map((c) => c.videoUrl));
      for (const log of res.data.logs) {
        if (log.status !== 'succeeded') continue;
        if (!log.outputs) continue;
        try {
          const outputs: Array<{ url: string; type: string }> = JSON.parse(log.outputs);
          const video = outputs.find((o) => o.type === 'video');
          if (!video?.url || existingUrls.has(video.url)) continue;

          this.studio.pushClip({
            id: crypto.randomUUID(),
            prompt: '',
            videoUrl: video.url,
            createdAt: new Date(log.created_at).getTime(),
            durationSeconds: 5,
            resolution: '480p',
          });
          existingUrls.add(video.url);
        } catch {
          // JSON parse error — skip this log entry
        }
      }
    });
  }

  /** Forwarded from the take-checklist's `(toggle)` output. */
  protected onToggleTake(takeIndex: number): void {
    this.studio.toggleTake(takeIndex);
  }

  /**
   * Forwarded from the takes-reel's `(selectTake)` output.
   * Selects a take by its index, setting the cursor so the next
   * generation targets it. The prompt builder switches to "VOLVER A GENERAR"
   * if this take already has a video.
   */
  protected onSelectTake(takeIndex: number): void {
    this.studio.selectTake(takeIndex);
  }

  /**
   * Forwarded from the takes-reel's `(toggleActive)` output.
   * Reactivates a discarded take via the backend API, then updates
   * local state so the reel reflects the change.
   */
  protected onToggleTakeActive(takeId: string, takeIndex: number): void {
    const projectId = this.studio.projectId();
    const sceneId = this.studio.sceneId();
    if (!projectId || !sceneId) return;

    this.projectsApi.toggleTakeActive(projectId, sceneId, takeId).subscribe((res) => {
      if (!res.error && res.data) {
        // Reload the session's backend takes to reflect the toggle
        this.studio.selectTake(takeIndex);
      }
    });
  }

  /**
   * Dispatch one independent generation request per `batchCount`. Each
   * request gets its own backend task id, pending-task entry, and 3s
   * polling loop so the viewer can render individual progress rings for
   * the batch.
   */
  protected onGenerate(): void {
    if (!this.studio.projectId() || !this.studio.sceneId()) {
      this.toast.add({
        summary: 'Error',
        detail: 'Debes seleccionar un proyecto y una escena antes de generar',
        severity: 'error',
        life: 3000,
      });
      this.gateOpen.set(true);
      return;
    }

    const text = this.studio.rawDescription().trim();
    if (!text) {
      this.toast.add({
        summary: 'Error',
        detail: 'Debes escribir un prompt antes de generar',
        severity: 'error',
        life: 3000,
      });
      return;
    }
    const count = Math.max(1, Math.min(MAX_BATCH_COUNT, this.studio.output().batchCount || 1));
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
    const takeIndex = this.studio.currentTake()?.index;
    const localId = this.studio.startGeneration(label, takeIndex);

    if (!this.studio.modelCode()) {
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
          this.studio.failGeneration(localId);
          return;
        }
        const initial = res.data;

        // Guardar taskId y modelName en la entrada pendiente para poder
        // recuperar el estado si hay una recarga.
        this.studio.setGenerationTaskId(localId, initial.taskId);
        const modelCode = this.studio.modelCode();
        if (modelCode) {
          this.studio.restorePendingTask(localId, initial.taskId, modelCode.name);
        }

        if (initial.status === 'succeeded') {
          this.finishWithClip(localId, initial, source);
          return;
        }
        if (initial.status === 'failed') {
          this.studio.failGeneration(localId);
          return;
        }
        // Async path: kick off the polling loop.
        this.studio.updateGenerationProgress(
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
          this.studio.failGeneration(localId);
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
          this.studio.updateGenerationProgress(localId, next);
        } else if (task.status === 'succeeded') {
          this.finishWithClip(localId, task, source);
        } else if (task.status === 'failed') {
          this.studio.failGeneration(localId);
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
   *
   * After the clip is ready, associate it with the current session's take
   * by calling the projects API's save-generation endpoint. The backend
   * handles discarding the previous generation for the same take number
   * and returns the new take record.
   */
  private finishWithClip(
    localId: string,
    task: StudioTaskResponse,
    source: GeneratedClip['source'],
  ): void {
    const out = task.outputs.find((o) => o.type === 'video') ?? task.outputs[0];
    if (!out?.url) {
      this.studio.failGeneration(localId);
      this.toast.add({
        summary: 'Error',
        detail: 'No se recibió un video del servidor',
        severity: 'error',
        life: 5000,
      });
      return;
    }
    const output = this.studio.output();
    const clip: GeneratedClip = {
      id: crypto.randomUUID(),
      prompt: this.studio.rawDescription(),
      videoUrl: out.url,
      createdAt: Date.now(),
      durationSeconds: output.durationSeconds,
      resolution: output.resolution,
      source,
    };
    this.studio.completeGeneration(localId, clip);

    // Associate the generated video with the current scene+take
    this.persistGeneration(clip);

    this.toast.add({
      summary: 'Generación completada',
      detail: 'El video se ha generado correctamente',
      severity: 'success',
      life: 5000,
    });
  }

  /**
   * Persist the generation result to the backend, linking it to the
   * current session's project, scene, and take. The backend discards
   * (deactivates) any previous generation for the same take number.
   */
  private persistGeneration(clip: GeneratedClip): void {
    const projectId = this.studio.projectId();
    const sceneId = this.studio.sceneId();
    const take = this.studio.currentTake();
    if (!projectId || !sceneId || !take || !clip.videoUrl) return;

    this.projectsApi
      .saveGeneration(projectId, sceneId, {
        number: take.index,
        video_url: clip.videoUrl,
      })
      .subscribe((res) => {
        if (!res.error && res.data) {
          this.studio.saveGenerationResponse(take.index, {
            id: res.data.id,
            video_url: res.data.video_url,
          });
        }
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
    const output = this.studio.output();
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
      model: this.studio.modelCode()?.name ?? '',
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
      project_id: this.studio.projectId() ?? undefined,
      scene_id: this.studio.sceneId() ?? undefined,
      scene_code: this.studio.sceneCode() || undefined,
    };
  }

  /**
   * Auto-generated text prepended to the prompt so the model knows which
   * reference image anchors the first/last frame of the video. Order
   * mirrors `collectReferenceAssets`: first-frame is always Image 1; if
   * a last-frame is set without a first-frame, it stands alone as Image 1.
   */
  private buildFrameHints(): string {
    const first = this.studio.firstFrame();
    const last = this.studio.lastFrame();
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

    const first = this.studio.firstFrame();
    if (first) push(first.id, first.filename, first.kind, first.tag || 'First Frame');
    const last = this.studio.lastFrame();
    if (last) push(last.id, last.filename, last.kind, last.tag || 'Last Frame');
    for (const free of this.studio.freeAssets()) {
      push(free.id, free.filename, free.kind, free.tag);
    }
    for (const used of this.studio.usedAssets()) {
      const type: 'image' | 'video' | 'audio' = used.kind === 'mixed' ? 'image' : used.kind;
      push(used.fileId, used.filename, type, used.name);
    }
    return out;
  }

  /** Snapshot of the editor inputs at submit time — drives "reuse prompt". */
  private buildSourceSnapshot(compiled: string): GeneratedClip['source'] {
    return {
      rawDescription: compiled,
      cinematography: this.studio.cinematography(),
      output: this.studio.output(),
      assets: {
        firstFrame: this.studio.firstFrame(),
        lastFrame: this.studio.lastFrame(),
        free: this.studio.freeAssets(),
      },
    };
  }
}
