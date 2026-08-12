import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { GenerationLogsService, ModelService } from '@app/services';
import {
  FixAssetResult,
  GalleryAsset,
  GalleryModel,
  ModelAssetSync,
} from '@core/interfaces/seedance.interface';
import { ModelData } from '@app/core/interfaces';
import { SourceThumbnailAssetPipe } from '@app/core/pipes';
import { AssetInfoPopoverComponent } from '@shared/components/asset-info-popover/asset-info-popover.component';

interface ModelOption {
  label: string;
  value: string;
}

interface RatioOption {
  label: string;
  value: string;
  /** Proporción visual del rectángulo (px) — misma técnica del image-gen-panel. */
  w: number;
  h: number;
}

/** Máximo de errores que muestra el diálogo de "últimos errores". */
const MAX_ERRORS = 5;

/** Aspect ratios válidos para BytePlus — mismos del panel de generación.
 *  w/h son las dimensiones del mini-rectángulo proporcional de cada opción. */
const AI_RATIOS: RatioOption[] = [
  { label: '1:1 (Square)', value: '1:1', w: 16, h: 16 },
  { label: '4:3', value: '4:3', w: 16, h: 12 },
  { label: '3:4', value: '3:4', w: 12, h: 16 },
  { label: '3:2', value: '3:2', w: 18, h: 12 },
  { label: '2:3', value: '2:3', w: 12, h: 18 },
  { label: '4:5', value: '4:5', w: 16, h: 20 },
  { label: '5:4', value: '5:4', w: 20, h: 16 },
];

@Component({
  selector: 'app-external-galleries',
  imports: [
    TranslatePipe,
    DatePipe,
    FormsModule,
    ButtonModule,
    SelectModule,
    DialogModule,
    TooltipModule,
    ToastModule,
    SourceThumbnailAssetPipe,
    AssetInfoPopoverComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  templateUrl: './external-galleries.component.html',
})
export class ExternalGalleriesComponent implements OnInit {
  private readonly genLogs = inject(GenerationLogsService);
  private readonly modelService = inject(ModelService);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Asset metadata popover for a gallery thumbnail. */
  @ViewChild('assetInfoPopover') protected readonly assetInfoPopover!: AssetInfoPopoverComponent;

  /** Open the metadata popover for a gallery asset. */
  protected openAssetInfo(event: Event, a: GalleryAsset): void {
    event.stopPropagation();
    this.assetInfoPopover.open(event, {
      id: a.file_id,
      name: a.file_name || a.file_id,
      kind: a.mime_type.startsWith('video')
        ? 'video'
        : a.mime_type.startsWith('audio')
          ? 'audio'
          : 'image',
      type: a.mime_type,
    });
  }

  protected readonly modelOptions = signal<ModelOption[]>([]);
  protected readonly modelsMeta = signal<GalleryModel[]>([]);
  protected readonly selectedModelId = signal<string>('');

  protected readonly assets = signal<GalleryAsset[]>([]);
  protected readonly loadingModels = signal(false);
  protected readonly loadingAssets = signal(false);

  // ── Retry / fix ──────────────────────────────────────────────────

  protected readonly fixingId = signal<string | null>(null);

  // ── AI regenerate dialog ─────────────────────────────────────────

  protected readonly aiDialogVisible = signal(false);
  protected readonly aiRatio = signal<string>('1:1');
  protected readonly aiTarget = signal<GalleryAsset | null>(null);
  protected readonly aiRatioOptions: RatioOption[] = AI_RATIOS;
  protected readonly aiImageModels = signal<ModelData[]>([]);
  protected readonly aiLoadingModels = signal(false);
  protected readonly aiModelId = signal<string | null>(null);

  // ── Errors dialog ────────────────────────────────────────────────

  protected readonly errorsDialogVisible = signal(false);
  protected readonly errorsLoading = signal(false);
  protected readonly errors = signal<ModelAssetSync[]>([]);
  protected readonly errorsTitle = signal('');

  ngOnInit(): void {
    this.loadModels();
  }

  private loadModels(): void {
    this.loadingModels.set(true);
    this.genLogs
      .getGalleryModels()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.loadingModels.set(false);
        if (res.error || !res.data) {
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('COMMON.ERROR'),
            detail: res.msg || this.i18n.instant('ADMIN.GALLERIES.LOAD_MODELS_FAILED'),
            life: 3000,
          });
          return;
        }
        this.modelsMeta.set(res.data);
        this.modelOptions.set(
          res.data.map((m) => ({ label: this.modelLabel(m), value: m.model_id })),
        );
        // Auto-select the first model so the table renders without extra clicks.
        if (res.data.length > 0) {
          this.selectedModelId.set(res.data[0].model_id);
          this.loadAssets(res.data[0].model_id);
        }
      });
  }

  /** Label for the model selector — name plus the sync counts. */
  private modelLabel(m: GalleryModel): string {
    const parts = [`${m.active} active`, `${m.failed} failed`];
    if (m.syncing > 0) parts.push(`${m.syncing} syncing`);
    return `${m.model_name} (${parts.join(' · ')})`;
  }

  protected onModelChange(modelId: string): void {
    this.selectedModelId.set(modelId);
    if (modelId) this.loadAssets(modelId);
  }

  private loadAssets(modelId: string): void {
    this.loadingAssets.set(true);
    this.assets.set([]);
    this.genLogs
      .getGalleryAssets(modelId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.loadingAssets.set(false);
        if (res.error || !res.data) {
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('COMMON.ERROR'),
            detail: res.msg || this.i18n.instant('ADMIN.GALLERIES.LOAD_ASSETS_FAILED'),
            life: 3000,
          });
          return;
        }
        this.assets.set(res.data);
      });
  }

  /** Total counts for the selected model (header summary chips). */
  protected selectedModelMeta(): GalleryModel | undefined {
    return this.modelsMeta().find((m) => m.model_id === this.selectedModelId());
  }

  // ── Retry / fix ──────────────────────────────────────────────────

  /** Retry the sync; the backend auto-normalizes geometry (or falls back
   *  to AI regeneration in "auto" mode when configured). */
  protected retryAsset(a: GalleryAsset): void {
    this.runFix(a, 'auto');
  }

  /** Shared runner for the retry / AI-regenerate flows. */
  private runFix(a: GalleryAsset, mode: 'auto' | 'normalize' | 'ai', model?: string): void {
    this.fixingId.set(a.id);
    this.aiDialogVisible.set(false);
    this.genLogs
      .fixAsset(
        a.model_id,
        a.file_id,
        mode,
        mode === 'ai' ? this.aiRatio() : undefined,
        mode === 'ai' ? model : undefined,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.fixingId.set(null);
        if (res.error || !res.data) {
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('ADMIN.GALLERIES.FIX_FAILED'),
            detail: res.msg || this.i18n.instant('ADMIN.GALLERIES.FIX_SYNC_FAILED'),
            life: 4000,
          });
          return;
        }
        this.toastFixResult(res.data);
        this.loadAssets(this.selectedModelId());
      });
  }

  private toastFixResult(r: FixAssetResult): void {
    const fixedLabel =
      r.used_fix === 'ai'
        ? this.i18n.instant('ADMIN.GALLERIES.REGENERATED_AI')
        : r.used_fix === 'normalize'
          ? this.i18n.instant('ADMIN.GALLERIES.NORMALIZED')
          : '';
    const detail =
      r.status === 'failed'
        ? this.i18n.instant('ADMIN.GALLERIES.FIX_RESULT_FAILED', {
            msg: r.error_message ? ': ' + r.error_message : '',
          })
        : `${fixedLabel ? fixedLabel + ' · ' : ''}${r.status}`;
    this.toast.add({
      severity: r.status === 'failed' ? 'error' : 'success',
      summary: this.i18n.instant('ADMIN.GALLERIES.SYNC_FIXED'),
      detail,
      life: 5000,
    });
  }

  /** Open the AI-regenerate dialog for a failed asset. */
  protected openAiDialog(a: GalleryAsset): void {
    this.aiTarget.set(a);
    this.aiRatio.set('1:1');
    this.aiDialogVisible.set(true);
    this.loadAiModels();
  }

  /** Load the image generator models for the AI dialog (mirrors the
   *  image-gen-panel). Defaults the selection to the first model. */
  private loadAiModels(): void {
    if (this.aiImageModels().length > 0 || this.aiLoadingModels()) return;
    this.aiLoadingModels.set(true);
    this.modelService
      .getAllModels('image')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.aiLoadingModels.set(false);
        if (res.error || !res.data) {
          this.toast.add({
            severity: 'warn',
            summary: this.i18n.instant('ADMIN.GALLERIES.NO_IMAGE_MODELS'),
            detail: res.msg || this.i18n.instant('ADMIN.GALLERIES.LOAD_IMAGE_MODELS_FAILED'),
            life: 3000,
          });
          return;
        }
        this.aiImageModels.set(res.data);
        if (res.data.length > 0) {
          this.aiModelId.set(res.data[0].id);
        }
      });
  }

  protected onAiModelChange(id: string): void {
    this.aiModelId.set(id);
  }

  /** Regenerate the asset with the image generator at the chosen ratio. */
  protected regenerateWithAI(): void {
    const a = this.aiTarget();
    if (!a) return;
    const model = this.aiImageModels().find((m) => m.id === this.aiModelId());
    this.runFix(a, 'ai', model?.name);
  }

  // ── Errors dialog ────────────────────────────────────────────────

  protected showErrors(a: GalleryAsset): void {
    this.errors.set([]);
    this.errorsLoading.set(true);
    this.errorsTitle.set(a.file_name || a.file_id);
    this.errorsDialogVisible.set(true);
    this.genLogs
      .getGalleryErrors(a.model_id, a.file_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.errorsLoading.set(false);
        if (res.error || !res.data) {
          this.toast.add({
            severity: 'error',
            summary: 'Error',
            detail: res.msg || 'Failed to load errors',
            life: 3000,
          });
          return;
        }
        this.errors.set(res.data);
      });
  }

  protected readonly MAX_ERRORS = MAX_ERRORS;
}
