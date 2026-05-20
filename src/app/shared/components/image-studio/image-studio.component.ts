import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Popover } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { DropZoneComponent } from '@shared/components/drop-zone/drop-zone.component';
import { FilesApiService, ImageGeneratorService } from '@app/services';
import { ImageGenerateRequest, ImageReference } from '@app/core/interfaces';

/** Output edge length tiers exposed to the user. */
type OutputSize = '1k' | '2k' | '4k';

interface AspectRatioOption {
  value: string;
  labelKey: string;
  /** Glyph ratio for the popover thumbnail (matches the aspect visually). */
  width: number;
  height: number;
}

/** Reference image staged for the next generation call. */
interface ReferenceImage {
  fileId: string;
  filename: string;
  /** Pre-signed serve URL — drives the thumbnail strip. */
  url: string;
}

/** gemini-3.1-flash-image-preview accepts at most this many references. */
const MAX_REFERENCES = 10;

/**
 * Image Studio — disclosure-style panel that wraps the AI image generator
 * (gemini-3.1-flash-image-preview). Sits inside Section 01 ("Character &
 * Assets") right above the "My Assets" band so the user can produce a
 * fresh reference image and immediately drop it into the asset grid below.
 *
 * Controls
 *   ─ Prompt textarea
 *   ─ Reference images (up to 10, uploaded via /files/upload)
 *   ─ Aspect ratio selector (popover with 5 ratios approved by the model)
 *   ─ Output size pills (1K / 2K / 4K)
 *   ─ Generate button → POST /studio/image/generate via ImageGeneratorService
 *
 * Result urls land in `resultUrls` and render as a small preview strip
 * below the controls so the user can download or right-click → save.
 */
@Component({
  selector: 'app-image-studio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    Popover,
    ButtonModule,
    TextareaModule,
    DropZoneComponent,
  ],
  providers: [MessageService],
  templateUrl: './image-studio.component.html',
})
export class ImageStudioComponent {
  private readonly imageGen = inject(ImageGeneratorService);
  private readonly filesApi = inject(FilesApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxReferences = MAX_REFERENCES;

  /** Disclosure state — body is mounted only when expanded. */
  protected readonly expanded = signal(false);

  // ── Form state ──────────────────────────────────────────────────────

  protected readonly prompt = signal('');
  protected readonly aspectRatio = signal<string>('1:1');
  protected readonly outputSize = signal<OutputSize>('1k');

  /**
   * Uploaded reference images staged for the next generation call.
   * Capped at MAX_REFERENCES (model-side limit for
   * gemini-3.1-flash-image-preview).
   */
  protected readonly references = signal<ReferenceImage[]>([]);

  /** True while at least one upload request is in-flight. */
  protected readonly uploadingReferences = signal(false);

  // ── Generation lifecycle ────────────────────────────────────────────

  protected readonly generating = signal(false);
  protected readonly resultUrls = signal<string[]>([]);
  protected readonly errorMsg = signal<string | null>(null);

  /**
   * Model is fixed for this surface — the controls (ratios + sizes) are
   * tailored to gemini-3.1-flash-image-preview. If we ever open this to
   * other models, lift this into an input + per-model option lookup.
   */
  private readonly MODEL_ID = 'gemini-3.1-flash-image-preview';

  /** Aspect ratios approved by gemini-3.1-flash-image-preview. */
  protected readonly aspectRatioOptions: AspectRatioOption[] = [
    { value: '1:1', labelKey: 'STUDIO.IMAGE_GEN.RATIOS.SQUARE', width: 24, height: 24 },
    { value: '16:9', labelKey: 'STUDIO.IMAGE_GEN.RATIOS.WIDE', width: 32, height: 18 },
    { value: '9:16', labelKey: 'STUDIO.IMAGE_GEN.RATIOS.PORTRAIT', width: 18, height: 32 },
    { value: '4:3', labelKey: 'STUDIO.IMAGE_GEN.RATIOS.STANDARD', width: 28, height: 21 },
    { value: '3:4', labelKey: 'STUDIO.IMAGE_GEN.RATIOS.STANDARD_P', width: 21, height: 28 },
  ];

  /** Output sizes — N×N upper bound applied by the backend. */
  protected readonly outputSizes: { value: OutputSize; label: string; px: number }[] = [
    { value: '1k', label: '1K', px: 1024 },
    { value: '2k', label: '2K', px: 2048 },
    { value: '4k', label: '4K', px: 4096 },
  ];

  protected readonly canGenerate = computed(
    () =>
      this.prompt().trim().length > 0 &&
      !this.generating() &&
      !this.uploadingReferences(),
  );

  /** Remaining reference slots (0 ⇒ drop-zone is disabled). */
  protected readonly remainingRefSlots = computed(
    () => MAX_REFERENCES - this.references().length,
  );

  protected readonly referencesFull = computed(
    () => this.references().length >= MAX_REFERENCES,
  );

  protected readonly activeAspect = computed(
    () =>
      this.aspectRatioOptions.find((o) => o.value === this.aspectRatio()) ??
      this.aspectRatioOptions[0],
  );

  // ── Handlers ────────────────────────────────────────────────────────

  protected toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  protected setAspectRatio(value: string, popover: Popover): void {
    this.aspectRatio.set(value);
    popover.hide();
  }

  protected setOutputSize(value: OutputSize): void {
    this.outputSize.set(value);
  }

  protected resolutionPx(): number {
    return this.outputSizes.find((s) => s.value === this.outputSize())?.px ?? 1024;
  }

  /**
   * Accept a batch of dropped/selected files as reference inputs. Each
   * file is uploaded to /files/upload (temp storage, images category) and
   * the returned fileId is stored as an `ImageReference` for the next
   * generate() call. Files beyond the remaining capacity are trimmed off
   * with a warning toast so the user knows their drop was clipped.
   */
  protected onReferenceFiles(files: File[]): void {
    if (this.referencesFull()) {
      this.toast.add({
        severity: 'warn',
        summary: 'References full',
        detail: `Max ${MAX_REFERENCES} reference images.`,
        life: 3000,
      });
      return;
    }
    const slots = this.remainingRefSlots();
    const accepted = files.slice(0, slots);
    const overflow = files.length - accepted.length;
    if (overflow > 0) {
      this.toast.add({
        severity: 'warn',
        summary: 'Some files skipped',
        detail: `Only ${slots} of ${files.length} files added — max is ${MAX_REFERENCES}.`,
        life: 3000,
      });
    }
    this.uploadingReferences.set(true);
    let pending = accepted.length;
    if (pending === 0) {
      this.uploadingReferences.set(false);
      return;
    }
    for (const f of accepted) {
      this.filesApi
        .upload({ file: f, category: 'images', storage: 'temp' })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((res) => {
          pending -= 1;
          if (pending === 0) this.uploadingReferences.set(false);

          if (res.error || !res.data) {
            this.toast.add({
              severity: 'error',
              summary: 'Upload error',
              detail: res.msg,
              life: 4000,
            });
            return;
          }
          // Guard against parallel uploads pushing past the cap.
          if (this.references().length >= MAX_REFERENCES) return;
          this.references.update((list) => [
            ...list,
            {
              fileId: res.data!.id,
              filename: res.data!.filename,
              url: this.filesApi.serveUrl(res.data!.id),
            },
          ]);
        });
    }
  }

  protected onRemoveReference(fileId: string): void {
    this.references.update((list) => list.filter((r) => r.fileId !== fileId));
  }

  protected onGenerate(): void {
    if (!this.canGenerate()) return;
    const refs: ImageReference[] = this.references().map((r) => ({
      fileId: r.fileId,
      role: 'subject',
    }));
    const payload: ImageGenerateRequest = {
      model: this.MODEL_ID,
      prompt: this.prompt().trim(),
      ratio: this.aspectRatio(),
      resolution: String(this.resolutionPx()),
      ...(refs.length ? { references: refs } : {}),
    };
    this.generating.set(true);
    this.errorMsg.set(null);

    this.imageGen
      .generate(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.generating.set(false);
        if (res.error || !res.data) {
          const msg = res.msg || 'Generation failed';
          this.errorMsg.set(msg);
          this.toast.add({ severity: 'error', summary: 'Image generation', detail: msg, life: 4000 });
          return;
        }
        const urls = (res.data.outputs ?? []).map((o) => o.url).filter(Boolean);
        this.resultUrls.set(urls);
        this.toast.add({
          severity: 'success',
          summary: 'Image generation',
          detail: `${urls.length} image${urls.length === 1 ? '' : 's'} generated`,
          life: 3000,
        });
      });
  }
}
