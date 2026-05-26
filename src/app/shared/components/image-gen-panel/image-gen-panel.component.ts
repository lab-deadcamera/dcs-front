import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { Popover } from 'primeng/popover';
import { environment } from '@environment/environment';
import { ModelService, ImageGeneratorService, FilesApiService } from '@app/services';
import { ModelData, ImageGenerateRequest } from '@app/core/interfaces';
import { StudioStore } from '@app/core/stores/studio.store';
import { SessionStore } from '@app/core/stores/session.store';
import { SourceThumbnailAssetPipe } from '@app/core/pipes';

@Component({
  selector: 'app-image-gen-panel',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    Popover,
    SourceThumbnailAssetPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-gen-panel.component.html',
})
export class ImageGenPanelComponent implements OnInit {
  private readonly modelService = inject(ModelService);
  private readonly session = inject(SessionStore);
  private readonly imageGenerator = inject(ImageGeneratorService);
  private readonly filesApi = inject(FilesApiService);
  private readonly studio = inject(StudioStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly imageModels = signal<ModelData[]>([]);
  protected readonly loading = signal(true);
  protected readonly selectedModelId = signal<string | null>(null);
  protected readonly selectedModelName = signal<string | null>(null);
  protected readonly prompt = signal('');
  protected readonly generating = signal(false);
  protected readonly saving = signal(false);
  protected readonly generatedImage = signal<{ url: string } | null>(null);
  protected readonly savedAssetUrl = signal<string | null>(null);
  protected readonly previewVisible = signal(false);
  protected readonly error = signal<string | null>(null);

  // ── Preview dialog ──────────────────────────────────────────────────
  protected readonly previewDialogVisible = signal(false);
  protected readonly previewLoading = signal(false);
  protected readonly previewData = signal<Record<string, unknown> | null>(null);
  protected readonly previewError = signal<string | null>(null);
  /** Pretty-printed JSON for the preview modal. */
  protected readonly previewDataPretty = computed(() => {
    const d = this.previewData();
    return d ? JSON.stringify(d, null, 2) : '';
  });

  protected readonly referenceImages = signal<Array<{ id: string; url: string; fileId: string }>>(
    [],
  );

  // ── Aspect ratio + resolution (gemini-3-pro-image-preview & friends) ──
  //
  // The icon swatches in the trigger button are scaled from a 24×24 cell
  // so the preview matches the chosen ratio without doing math in the
  // template. Source of truth lives in signals; the payload reads them at
  // submit time so changes apply immediately.

  /** All aspect ratios supported by the latest Gemini image preview model. */
  protected readonly ratioOptions: ReadonlyArray<{ value: string; w: number; h: number }> = [
    { value: '1:1', w: 24, h: 24 },
    { value: '4:3', w: 24, h: 18 },
    { value: '3:4', w: 18, h: 24 },
    { value: '3:2', w: 24, h: 16 },
    { value: '2:3', w: 16, h: 24 },
    { value: '16:9', w: 32, h: 18 },
    { value: '9:16', w: 14, h: 24 },
    { value: '21:9', w: 42, h: 18 },
    { value: '4:5', w: 19, h: 24 },
    { value: '5:4', w: 24, h: 19 },
  ];

  /** Output tiers — backend resolves the actual pixel dimensions per ratio. */
  protected readonly resolutionOptions: ReadonlyArray<{ value: '1K' | '2K' | '4K'; hint: string }> =
    [
      { value: '1K', hint: '~1024 px' },
      { value: '2K', hint: '~2048 px' },
      { value: '4K', hint: '~4096 px' },
    ];

  protected readonly selectedRatio = signal<string>('1:1');
  protected readonly selectedResolution = signal<'1K' | '2K' | '4K'>('1K');

  /** Live swatch dimensions for the ratio trigger button. */
  protected readonly ratioPreview = computed(() => {
    const r = this.ratioOptions.find((o) => o.value === this.selectedRatio());
    return r ?? this.ratioOptions[0];
  });

  /**
   * When false, the secondary "Preview" button is hidden. Defaults to false
   * because preview is a privileged dry-run surface (SUPER_ADMIN only) --
   * the parent shell flips it on via `[canPreview]` based on the session
   * role level so the rest of the studio chrome stays auth-agnostic.
   */
  readonly canPreview = signal(false);

  /** Fires when the user clicks the Preview button for a dry-run. */
  readonly preview = output<void>();

  protected readonly canGenerate = (): boolean =>
    !this.generating() &&
    !!this.selectedModelId() &&
    this.prompt().trim().length > 0 &&
    this.hasSession();

  ngOnInit(): void {
    this.loadImageModels();
    this.canPreview.set(this.session.roleLevel() === 0);
  }

  private loadImageModels(): void {
    this.loading.set(true);
    this.modelService
      .getAllModels('image')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.loading.set(false);
        if (res.error || !res.data) return;
        this.imageModels.set(res.data);
        if (res.data.length > 0) {
          const first = res.data[0];
          this.selectedModelId.set(first.id);
          this.selectedModelName.set(first.name);
        }
      });
  }

  protected onModelChange(id: string): void {
    this.selectedModelId.set(id);
    const model = this.imageModels().find((m) => m.id === id);
    this.selectedModelName.set(model?.name ?? null);
  }

  protected onPickRatio(value: string): void {
    this.selectedRatio.set(value);
  }

  protected onPickResolution(value: '1K' | '2K' | '4K'): void {
    this.selectedResolution.set(value);
  }

  protected onReferencePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Upload as temp asset first
    this.filesApi
      .upload({ file, category: 'images', storage: 'temp' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        input.value = '';
        if (res.error || !res.data) return;
        this.referenceImages.update((list) => [
          ...list,
          { id: res.data!.id, url: res.data!.url, fileId: res.data!.id },
        ]);
      });
  }

  protected removeReference(id: string): void {
    this.referenceImages.update((list) => list.filter((r) => r.id !== id));
  }

  /** Convierte una URL relativa del backend en una URL absoluta usando API_BASE_URL. */
  private resolveUrl(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return environment.API_BASE_URL + url;
    return environment.API_BASE_URL + '/outputs/' + url;
  }

  private hasSession(): boolean {
    return !!this.studio.projectId() && !!this.studio.sceneId();
  }

  private generatePayload(): ImageGenerateRequest {
    const model = this.imageModels().find((m) => m.id === this.selectedModelId());
    if (!model || !this.prompt().trim()) {
      throw new Error('Model or prompt is not defined');
    }

    if (!this.hasSession()) {
      throw new Error('Project or scene is not defined');
    }

    this.generating.set(true);
    this.error.set(null);
    this.generatedImage.set(null);
    this.savedAssetUrl.set(null);

    const takeIndex = this.studio.currentTake()?.index ?? 1;

    // Build content array: text prompt + reference images
    const content: Array<{ type: string; text?: string; id?: string }> = [
      { type: 'text', text: this.prompt().trim() },
    ];
    for (const ref of this.referenceImages()) {
      content.push({ type: 'image', id: ref.fileId });
    }

    const payload = {
      model: model.name,
      content,
      ratio: this.selectedRatio(),
      resolution: this.selectedResolution(),
      project_id: this.studio.projectId() ?? '',
      scene_id: this.studio.sceneId() ?? '',
      scene_code: this.studio.sceneCode(),
      take_number: takeIndex,
    } as unknown as ImageGenerateRequest;

    return payload;
  }

  protected onGenerate(): void {
    const payload = this.generatePayload();
    this.imageGenerator
      .generate(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.generating.set(false);
        if (res.error || !res.data) {
          this.error.set(res.msg || 'Generation failed');
          return;
        }
        const result = res.data;
        if (result.status === 'succeeded' && result.outputs?.length > 0) {
          this.generatedImage.set({ url: this.resolveUrl(result.outputs[0].url) });
        } else if (result.status === 'failed') {
          this.error.set(result.error || 'Generation failed');
        } else {
          this.pollTask(result.taskId);
        }
      });
  }

  protected onPreview(): void {
    const payload = this.generatePayload();
    this.previewDialogVisible.set(true);
    this.previewLoading.set(true);
    this.imageGenerator
      .preview(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.generating.set(false);
        this.previewLoading.set(false);
        if (res.error) {
          this.previewError.set(res.msg);
          return;
        }
        this.previewData.set(res.data ?? {});
      });
  }

  private pollTask(taskId: string): void {
    const poll = setInterval(() => {
      this.imageGenerator
        .status(taskId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((res) => {
          if (res.error || !res.data) {
            this.error.set(res.msg || 'Status check failed');
            this.generating.set(false);
            clearInterval(poll);
            return;
          }
          const result = res.data;
          if (result.status === 'succeeded') {
            this.generatedImage.set(
              result.outputs?.[0]?.url ? { url: this.resolveUrl(result.outputs[0].url) } : null,
            );
            this.generating.set(false);
            clearInterval(poll);
          } else if (result.status === 'failed') {
            this.error.set(result.error || 'Generation failed');
            this.generating.set(false);
            clearInterval(poll);
          }
        });
    }, 3000);
  }

  protected downloadImage(url: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-image.png';
    a.target = '_blank';
    a.click();
  }

  protected saveAsTempAsset(url: string): void {
    this.saving.set(true);
    this.savedAssetUrl.set(null);

    // Fetch the image and upload to server as temp asset
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `generated-${Date.now()}.png`, { type: blob.type });
        this.filesApi
          .upload({ file, category: 'temp', storage: 'temp' })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((res) => {
            this.saving.set(false);
            if (res.error || !res.data) {
              this.error.set('Failed to save asset: ' + (res.msg || 'Unknown error'));
              return;
            }
            this.savedAssetUrl.set(res.data.url);
          });
      })
      .catch((err) => {
        this.saving.set(false);
        this.error.set('Failed to fetch image: ' + err.message);
      });
  }
}
