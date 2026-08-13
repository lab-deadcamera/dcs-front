import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { GENERATE_URL_FILE } from '@app/shared/utils';

interface FileLike {
  id: string;
  filename?: string;
  mimeType?: string;
  mime_type?: string;
  size?: number;
}

@Component({
  selector: 'app-asset-viewer',
  imports: [TranslatePipe, ButtonModule, TooltipModule, DialogModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './asset-viewer.html',
  styleUrl: './asset-viewer.css',
})
export class AssetViewerComponent {
  private readonly confirm = inject(ConfirmationService);

  /** Two-way binding — open / close the dialog. */
  readonly visible = model(false);

  /** The file to preview. Accepts both camelCase (`mimeType`) and snake_case (`mime_type`). */
  readonly file = input<FileLike | null>(null);

  /** Whether to show a "Delete" button in the footer. */
  readonly allowDelete = input(false);

  /** Emitted when the user confirms deletion. Payload is the file id. */
  readonly deleteFile = output<string>();

  // --- zoom state ---
  protected readonly zoomed = signal(false);

  // --- helpers that accept both camelCase and snake_case ---

  protected filename(f: FileLike): string {
    return f.filename ?? '';
  }

  /**
   * Return `mimeType ?? mime_type`. Since SceneAssetAssignment uses
   * snake_case from the wire, and FileEntity uses camelCase, we accept both.
   */
  protected mimeType(f: FileLike): string {
    return f.mimeType ?? f.mime_type ?? '';
  }

  protected mimeLabel(f: FileLike): string {
    const mt = this.mimeType(f);
    const size = f.size;
    if (size != null) {
      return `${mt} · ${this.formatSize(size)}`;
    }
    return mt;
  }

  protected fileUrl(f: FileLike): string {
    return GENERATE_URL_FILE(f.id);
  }

  protected isImage(f: FileLike): boolean {
    return this.mimeType(f).startsWith('image/');
  }

  protected isVideo(f: FileLike): boolean {
    return this.mimeType(f).startsWith('video/');
  }

  protected isAudio(f: FileLike): boolean {
    return this.mimeType(f).startsWith('audio/');
  }

  // --- dialog callbacks ---

  protected onClose(): void {
    this.zoomed.set(false);
    this.visible.set(false);
  }

  protected onDelete(): void {
    const f = this.file();
    if (!f) return;

    this.confirm.confirm({
      header: 'Delete file',
      message: `Move "${this.filename(f)}" to trash?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteFile.emit(f.id),
    });
  }

  protected onDownload(): void {
    const f = this.file();
    if (!f) return;
    const url = this.fileUrl(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.filename(f);
    a.click();
  }

  // --- zoom ---

  protected zoomToClick(e: MouseEvent): void {
    if (this.zoomed()) {
      this.zoomed.set(false);
      return;
    }

    const img = e.currentTarget as HTMLImageElement | null;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    this.zoomed.set(true);

    const scrollTo = (): void => {
      const container = img.parentElement;
      if (!container) return;

      const scrollW = Math.max(img.naturalWidth - container.clientWidth, 0);
      const scrollH = Math.max(img.naturalHeight - container.clientHeight, 0);
      container.scrollLeft = scrollW * xPct;
      container.scrollTop = scrollH * yPct;
    };

    if (img.complete && img.naturalWidth > 0) {
      requestAnimationFrame(scrollTo);
    } else {
      img.addEventListener('load', () => requestAnimationFrame(scrollTo), { once: true });
    }
  }

  protected toggleZoomCenter(): void {
    if (this.zoomed()) {
      this.zoomed.set(false);
      return;
    }

    this.zoomed.set(true);

    requestAnimationFrame(() => {
      const img = document.querySelector('.preview-image-container img') as HTMLImageElement | null;
      const container = img?.parentElement;
      if (!img || !container) return;

      const scrollW = Math.max(img.naturalWidth - container.clientWidth, 0);
      const scrollH = Math.max(img.naturalHeight - container.clientHeight, 0);
      container.scrollLeft = scrollW / 2;
      container.scrollTop = scrollH / 2;
    });
  }

  protected onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.zoomed()) {
      this.zoomed.set(false);
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
