import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ModelService, ImageGeneratorService, FilesApiService } from '@app/services';
import { ModelData, ImageGenerateRequest } from '@app/core/interfaces';

@Component({
  selector: 'app-image-gen-panel',
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 border-t pt-4" style="border-color: var(--border-color);">
      <h2 class="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted">
        Image Generation
      </h2>

      <!-- Model selector -->
      <div class="flex flex-col gap-1">
        <label class="text-[12px] font-bold uppercase tracking-[0.12em]">
          Model
        </label>
        @if (imageModels().length > 0) {
          <p-select
            [options]="imageModels()"
            optionLabel="name"
            optionValue="id"
            [ngModel]="selectedModelId()"
            (ngModelChange)="onModelChange($event)"
            class="w-full"
          />
        } @else if (loading()) {
          <p class="text-[12px] italic text-fg-muted">Loading models…</p>
        } @else {
          <p class="text-[12px] text-fg-muted">
            No image models available. Configure one in the Providers section.
          </p>
        }
      </div>

      <!-- Reference images -->
      <div class="flex flex-col gap-1">
        <label class="text-[12px] font-bold uppercase tracking-[0.12em]">
          Reference Images
        </label>
        <div class="flex flex-wrap gap-2">
          @for (ref of referenceImages(); track ref.id) {
            <div class="relative h-16 w-16 overflow-hidden rounded border" style="border-color: var(--border-color);">
              <img [src]="ref.url" class="h-full w-full object-cover" alt="Reference" />
              <button
                type="button"
                class="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl bg-black/60 text-[10px] text-white hover:bg-black/80"
                (click)="removeReference(ref.id)"
              >✕</button>
            </div>
          }
          <label
            class="flex h-16 w-16 cursor-pointer items-center justify-center rounded border text-[20px] text-fg-muted transition-colors hover:bg-ink-800"
            style="border-color: var(--border-color);"
          >
            <input
              type="file"
              accept="image/*"
              class="hidden"
              (change)="onReferencePicked($event)"
            />
            +
          </label>
        </div>
      </div>

      <!-- Prompt textarea -->
      <div class="flex flex-col gap-1">
        <label class="text-[12px] font-bold uppercase tracking-[0.12em]">
          Prompt
        </label>
        <textarea
          [ngModel]="prompt()"
          (ngModelChange)="prompt.set($event)"
          rows="4"
          class="w-full resize-none rounded border px-3 py-2 text-[13px]"
          style="background: var(--ink-800); border-color: var(--border-color); color: var(--text-primary);"
          placeholder="Describe the image you want to generate…"
        ></textarea>
      </div>

      <!-- Generate button -->
      <div class="flex items-center gap-2">
        <p-button
          label="Generate Image"
          icon="pi pi-image"
          [loading]="generating()"
          [disabled]="!canGenerate()"
          (onClick)="onGenerate()"
        />
        @if (selectedModelName(); as name) {
          <span class="text-[11px] text-fg-muted">{{ name }}</span>
        }
      </div>

      <!-- Generated image result -->
      @if (generatedImage(); as img) {
        <div class="mt-2 flex flex-col gap-2">
          <img
            [src]="img.url"
            alt="Generated image"
            class="w-full rounded object-contain"
            style="max-height: 400px; background: var(--ink-900);"
          />
          <div class="flex items-center gap-2">
            <p-button
              severity="secondary"
              [text]="true"
              icon="pi pi-external-link"
              label="Open"
              (onClick)="openUrl(img.url)"
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
  protected readonly error = signal<string | null>(null);

  protected readonly referenceImages = signal<Array<{ id: string; url: string; fileId: string }>>([]);

  protected readonly canGenerate = (): boolean =>
    !this.generating() &&
    !!this.selectedModelId() &&
    this.prompt().trim().length > 0;

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

  protected onGenerate(): void {
    const model = this.imageModels().find((m) => m.id === this.selectedModelId());
    if (!model || !this.prompt().trim()) return;

    this.generating.set(true);
    this.error.set(null);
    this.generatedImage.set(null);
    this.savedAssetUrl.set(null);

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
      ratio: '1:1',
      resolution: '1K',
      project_id: '',
      scene_id: '',
      scene_code: '',
      take_number: 1,
    } as unknown as ImageGenerateRequest;
    this.imageGenerator.generate(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res) => {
      this.generating.set(false);
      if (res.error || !res.data) {
        this.error.set(res.msg || 'Generation failed');
        return;
      }
      const result = res.data;
      if (result.status === 'succeeded' && result.outputs?.length > 0) {
        this.generatedImage.set({ url: result.outputs[0].url });
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
            result.outputs?.[0]?.url ? { url: result.outputs[0].url } : null,
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

  protected openUrl(url: string): void {
    window.open(url, '_blank');
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
