import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * Drag-and-drop file zone with optional corner label.
 * Used for FIRST FRAME, LAST FRAME, and the generic "+" asset slot.
 *
 *   <ui-drop-zone label="FIRST FRAME" (filesDropped)="onFile($event)" />
 *
 * Emits the raw File[] — parent decides what to do (preview, upload, tag).
 */
@Component({
  selector: 'ui-drop-zone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      [class]="rootClasses()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
    >
      @if (label(); as l) {
        <span
          class="absolute top-0 left-0 bg-brand-red px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-fg-strong"
        >
          {{ l }}
        </span>
      }

      <div class="flex flex-col items-center gap-2 text-fg-muted">
        <span class="text-2xl leading-none">+</span>
        <span class="text-[11px] uppercase tracking-[0.18em]">
          {{ placeholder() }}
        </span>
      </div>

      <input
        type="file"
        class="sr-only"
        [accept]="accept()"
        [multiple]="multiple()"
        (change)="onPick($event)"
      />
    </label>
  `,
})
export class DropZoneComponent {
  readonly label = input<string | null>(null);
  readonly placeholder = input<string>('drop or click');
  readonly accept = input<string>('image/*,video/*');
  readonly multiple = input<boolean>(false);
  /** Compact variant for the "+" tile in the asset grid. */
  readonly compact = input<boolean>(false);

  readonly filesDropped = output<File[]>();

  protected readonly hovering = signal(false);

  protected rootClasses() {
    const base =
      'relative flex cursor-pointer items-center justify-center ' +
      'border border-dashed transition-colors';
    const size = this.compact() ? ' h-20 w-20' : ' h-44 w-full';
    const hover = this.hovering()
      ? ' border-brand-red bg-ink-700'
      : ' border-ink-500 bg-ink-850 hover:border-fg-muted';
    return base + size + hover;
  }

  protected onDragOver(e: DragEvent) {
    e.preventDefault();
    this.hovering.set(true);
  }

  protected onDragLeave() {
    this.hovering.set(false);
  }

  protected onDrop(e: DragEvent) {
    e.preventDefault();
    this.hovering.set(false);
    const files = e.dataTransfer?.files;
    if (files && files.length) this.filesDropped.emit(Array.from(files));
  }

  protected onPick(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.filesDropped.emit(Array.from(input.files));
      input.value = '';
    }
  }
}
