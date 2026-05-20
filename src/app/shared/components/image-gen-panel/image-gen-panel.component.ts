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
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { Popover } from 'primeng/popover';
import { environment } from '@environment/environment';
import { ModelService, ImageGeneratorService, FilesApiService } from '@app/services';
import { ModelData, ImageGenerateRequest } from '@app/core/interfaces';
import { StudioStore } from '@app/core/stores/studio.store';

@Component({
  selector: 'app-image-gen-panel',
  imports: [
    FormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    Popover,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2.5">
      <!--
        Controls bar — Model | Aspect Ratio | Resolution on one row so
        the panel stays short. Each chip carries its own accent so the
        block reads as a colored toolbar rather than a stack of selects.
      -->
      <div class="flex flex-wrap items-stretch gap-2">
        <!-- Model selector (grows) -->
        <div class="flex min-w-[160px] flex-1 flex-col gap-1">
          <label class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-500">
            <i class="pi pi-sparkles text-[10px]"></i> Model
          </label>
          @if (imageModels().length > 0) {
            <p-select
              [options]="imageModels()"
              optionLabel="name"
              optionValue="id"
              [ngModel]="selectedModelId()"
              (ngModelChange)="onModelChange($event)"
              styleClass="w-full image-gen-select"
            />
          } @else if (loading()) {
            <p class="text-[11px] italic text-fg-muted">Loading models…</p>
          } @else {
            <p class="text-[11px] text-fg-muted">No image models available.</p>
          }
        </div>

        <!-- Aspect ratio chip -->
        <div class="flex flex-col gap-1">
          <label class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary-500">
            <i class="pi pi-clone text-[10px]"></i> Ratio
          </label>
          <button
            type="button"
            class="group relative flex h-[38px] items-center gap-2 overflow-hidden rounded-md border border-secondary-500/40 bg-gradient-to-br from-secondary-500/15 to-secondary-500/5 px-3 text-[12px] font-bold text-secondary-500 transition-all hover:border-secondary-500 hover:from-secondary-500/30 hover:to-secondary-500/10 focus:outline-none focus:ring-2 focus:ring-secondary-500/40"
            (click)="ratioPop.toggle($event)"
            data-testid="image-gen-ratio-toggle"
          >
            <span
              aria-hidden="true"
              class="inline-block rounded-sm border border-secondary-500/60 bg-secondary-500/30"
              [style.width.px]="ratioPreview().w"
              [style.height.px]="ratioPreview().h"
            ></span>
            <span class="font-mono tracking-wide">{{ selectedRatio() }}</span>
            <i class="pi pi-angle-down text-[10px] opacity-70 transition-transform group-hover:translate-y-0.5"></i>
          </button>
        </div>

        <!-- Resolution chip -->
        <div class="flex flex-col gap-1">
          <label class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-500">
            <i class="pi pi-th-large text-[10px]"></i> Quality
          </label>
          <button
            type="button"
            class="group relative flex h-[38px] items-center gap-2 overflow-hidden rounded-md border border-accent-500/40 bg-gradient-to-br from-accent-500/15 to-accent-500/5 px-3 text-[12px] font-bold text-accent-500 transition-all hover:border-accent-500 hover:from-accent-500/30 hover:to-accent-500/10 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
            (click)="resPop.toggle($event)"
            data-testid="image-gen-resolution-toggle"
          >
            <span
              aria-hidden="true"
              class="flex h-5 w-5 items-center justify-center rounded-sm bg-accent-500/20 font-mono text-[9px] font-extrabold leading-none"
            >★</span>
            <span class="font-mono tracking-wider">{{ selectedResolution() }}</span>
            <i class="pi pi-angle-down text-[10px] opacity-70 transition-transform group-hover:translate-y-0.5"></i>
          </button>
        </div>
      </div>

      <!-- Ratio popover — every aspect ratio supported by the model -->
      <p-popover #ratioPop [dismissable]="true">
        <div class="w-72 p-2">
          <p class="mb-2 flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary-500">
            <i class="pi pi-clone text-[10px]"></i> Aspect Ratio
          </p>
          <ul class="grid grid-cols-4 gap-1.5">
            @for (r of ratioOptions; track r.value) {
              <li>
                <button
                  type="button"
                  class="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-md border transition-all hover:scale-[1.03] focus:outline-none"
                  [class]="
                    selectedRatio() === r.value
                      ? 'border-secondary-500 bg-gradient-to-br from-secondary-500/25 to-secondary-500/5 text-secondary-500 shadow-[0_0_12px_rgba(0,0,0,0.4)]'
                      : 'border-ink-600 bg-ink-900 text-fg-muted hover:border-secondary-500/60 hover:text-secondary-500'
                  "
                  (click)="onPickRatio(r.value); ratioPop.hide()"
                  [attr.aria-pressed]="selectedRatio() === r.value"
                  [attr.aria-label]="'Aspect ratio ' + r.value"
                  [attr.data-testid]="'image-gen-ratio-' + r.value"
                >
                  <span
                    aria-hidden="true"
                    class="inline-block rounded-sm border"
                    [class.border-secondary-500]="selectedRatio() === r.value"
                    [class.bg-secondary-500\/40]="selectedRatio() === r.value"
                    [class.border-fg-muted\/40]="selectedRatio() !== r.value"
                    [class.bg-fg-muted\/30]="selectedRatio() !== r.value"
                    [style.width.px]="r.w"
                    [style.height.px]="r.h"
                  ></span>
                  <span class="font-mono text-[10px] font-bold">{{ r.value }}</span>
                </button>
              </li>
            }
          </ul>
        </div>
      </p-popover>

      <!-- Resolution popover — 1K / 2K / 4K tiers -->
      <p-popover #resPop [dismissable]="true">
        <div class="w-56 p-2">
          <p class="mb-2 flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-500">
            <i class="pi pi-th-large text-[10px]"></i> Quality
          </p>
          <ul class="grid grid-cols-3 gap-1.5">
            @for (r of resolutionOptions; track r.value) {
              <li>
                <button
                  type="button"
                  class="flex w-full flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-2.5 transition-all hover:scale-[1.04] focus:outline-none"
                  [class]="
                    selectedResolution() === r.value
                      ? 'border-accent-500 bg-gradient-to-br from-accent-500/30 to-accent-500/5 text-accent-500 shadow-[0_0_12px_rgba(0,0,0,0.4)]'
                      : 'border-ink-600 bg-ink-900 text-fg-muted hover:border-accent-500/60 hover:text-accent-500'
                  "
                  (click)="onPickResolution(r.value); resPop.hide()"
                  [attr.aria-pressed]="selectedResolution() === r.value"
                  [attr.data-testid]="'image-gen-resolution-' + r.value"
                >
                  <span class="font-mono text-[15px] font-extrabold leading-none">{{ r.value }}</span>
                  <span class="text-[9px] italic opacity-80">{{ r.hint }}</span>
                </button>
              </li>
            }
          </ul>
        </div>
      </p-popover>

      <!--
        References strip — inline, single row, scrolls horizontally so
        the panel never grows tall. The "+" tile shares the row to keep
        the upload action visually paired with its results.
      -->
      <div class="flex items-center gap-2 overflow-x-auto py-1">
        <span class="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-muted">Refs</span>
        @for (ref of referenceImages(); track ref.id) {
          <div class="group relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-ink-600">
            <img [src]="ref.url" class="h-full w-full object-cover" alt="Reference" />
            <button
              type="button"
              class="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl bg-black/70 text-[9px] text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
              (click)="removeReference(ref.id)"
            >✕</button>
          </div>
        }
        <label
          class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed border-primary-500/50 bg-primary-500/5 text-primary-500 transition-colors hover:border-primary-500 hover:bg-primary-500/15"
          title="Add reference image"
        >
          <i class="pi pi-plus text-[14px]"></i>
          <input type="file" accept="image/*" class="hidden" (change)="onReferencePicked($event)" />
        </label>
      </div>

      <!-- Prompt textarea (2 rows — auto-expands on focus via resize) -->
      <textarea
        [ngModel]="prompt()"
        (ngModelChange)="prompt.set($event)"
        rows="2"
        class="w-full resize-y rounded-md border border-ink-600 bg-ink-800 px-3 py-2 text-[13px] text-fg-strong placeholder:italic placeholder:text-fg-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/40"
        placeholder="Describe the image you want to generate…"
      ></textarea>

      <!-- Generate CTA — gradient button + meta on the same row -->
      <div class="flex items-center justify-between gap-2">
        <button
          type="button"
          class="group flex items-center gap-2 rounded-md bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-950 shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-all hover:shadow-[0_4px_14px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          [disabled]="!canGenerate()"
          (click)="onGenerate()"
          data-testid="image-gen-generate"
        >
          @if (generating()) {
            <i class="pi pi-spin pi-spinner text-[12px]"></i>
            <span>Generating…</span>
          } @else {
            <i class="pi pi-bolt text-[12px] transition-transform group-hover:scale-110"></i>
            <span>Generate</span>
          }
        </button>
        @if (selectedModelName(); as name) {
          <span class="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted" [title]="name">
            ▸ {{ name }}
          </span>
        }
      </div>

      <!-- Generated image result — inline preview -->
      @if (generatedImage(); as img) {
        <div class="mt-2 flex flex-col gap-2">
          <img
            [src]="img.url"
            alt="Generated image"
            class="w-full cursor-pointer rounded object-contain"
            style="max-height: 300px; background: var(--ink-900);"
            (click)="previewVisible.set(true)"
          />
          <div class="flex items-center gap-2">
            <p-button
              severity="secondary"
              [text]="true"
              icon="pi pi-window-maximize"
              label="Preview"
              (onClick)="previewVisible.set(true)"
            />
            <p-button
              severity="secondary"
              [text]="true"
              icon="pi pi-download"
              label="Download"
              (onClick)="downloadImage(img.url)"
            />
            <p-button
              severity="info"
              [text]="true"
              icon="pi pi-save"
              [label]="saving() ? 'Saving…' : 'Save as temp asset'"
              [loading]="saving()"
              (onClick)="saveAsTempAsset(img.url)"
            />
            <p-button
              severity="secondary"
              [text]="true"
              icon="pi pi-trash"
              label="Clear"
              (onClick)="generatedImage.set(null)"
            />
          </div>
          @if (savedAssetUrl(); as url) {
            <p class="text-[11px] text-green-400">
              Saved as asset:
              <a [href]="url" target="_blank" class="underline">{{ url }}</a>
            </p>
          }
        </div>
      }

      <!-- Preview modal -->
      <p-dialog
        [visible]="previewVisible()"
        (visibleChange)="previewVisible.set($event)"
        [modal]="true"
        [closable]="true"
        [draggable]="false"
        [style]="{ width: '80vw', maxWidth: '1024px' }"
        header="Generated Image"
      >
        @if (generatedImage(); as img) {
          <img
            [src]="img.url"
            alt="Generated image"
            class="w-full rounded object-contain"
            style="max-height: 80vh; background: var(--ink-900);"
          />
        }
        <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2">
            <p-button
              severity="secondary"
              [text]="true"
              icon="pi pi-download"
              label="Download"
              (onClick)="downloadImage(generatedImage()!.url)"
            />
            <p-button
              severity="info"
              icon="pi pi-save"
              [label]="saving() ? 'Saving…' : 'Save as temp asset'"
              [loading]="saving()"
              (onClick)="saveAsTempAsset(generatedImage()!.url)"
            />
            <p-button
              severity="secondary"
              [text]="true"
              label="Close"
              (onClick)="previewVisible.set(false)"
            />
          </div>
        </ng-template>
      </p-dialog>

      <!-- Error state -->
      @if (error(); as msg) {
        <p class="text-[12px] text-red-400">{{ msg }}</p>
      }
    </div>
  `,
})
export class ImageGenPanelComponent implements OnInit {
  private readonly modelService = inject(ModelService);
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

  protected readonly referenceImages = signal<Array<{ id: string; url: string; fileId: string }>>([]);

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
  protected readonly resolutionOptions: ReadonlyArray<{ value: '1K' | '2K' | '4K'; hint: string }> = [
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

  protected readonly canGenerate = (): boolean =>
    !this.generating() &&
    !!this.selectedModelId() &&
    this.prompt().trim().length > 0 &&
    this.hasSession();

  ngOnInit(): void {
    this.loadImageModels();
  }

  private loadImageModels(): void {
    this.loading.set(true);
    this.modelService.getAllModels('image').pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res) => {
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
    this.filesApi.upload({ file, category: 'images', storage: 'temp' })
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

  protected onGenerate(): void {
    const model = this.imageModels().find((m) => m.id === this.selectedModelId());
    if (!model || !this.prompt().trim()) return;

    if (!this.hasSession()) {
      this.error.set('project_id, scene_id, scene_code and take_number are required for generation');
      return;
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
    this.imageGenerator.generate(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res) => {
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

  private pollTask(taskId: string): void {
    const poll = setInterval(() => {
      this.imageGenerator.status(taskId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res) => {
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
        this.filesApi.upload({ file, category: 'temp', storage: 'temp' })
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
