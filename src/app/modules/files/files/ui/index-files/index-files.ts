import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FilesService } from '../../services';
import { FileCategory, FileEntity, UploadParams } from '../../interfaces';
import { FileLinkDialogComponent } from '../components/file-link-dialog/file-link-dialog.component';
import { IndexCharacters } from '@modules/characters/characters/ui/index-characters/index-characters';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { SourceAssetPipe, SourceThumbnailAssetPipe } from '@app/core/pipes';
import { DOWNLOAD_VIDEO, GENERATE_URL_FILE } from '@app/shared/utils';
import { AssetViewerComponent } from '@shared/components/asset-viewer/asset-viewer.component';

type ViewTab = FileCategory | 'trash';

/**
 * Files — entry component for the global Files library.
 *
 * Category tabs (Images / Videos / Audio / Temp / Trash) drive the
 * active list. Upload is a single-file form rooted at the current
 * category; trash items show different actions (restore + hard delete).
 * The "Link to character" action opens a sub-dialog backed by
 * `CharactersService.assignFile` so the link flow is identical no matter
 * which page the user starts from.
 */
@Component({
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    ConfirmDialogModule,
    TabsModule,
    SourceAssetPipe,
    SourceThumbnailAssetPipe,
    ToastModule,
    FileLinkDialogComponent,
    IndexCharacters,
    DialogModule,
    AssetViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  templateUrl: './index-files.html',
  styleUrl: './index-files.css',
})
export class IndexFiles implements OnInit {
  protected readonly files = inject(FilesService);

  /** Translate a key with optional interpolation params. */
  private t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly tabs: { id: ViewTab; labelKey: string; icon: string }[] = [
    { id: 'images', labelKey: 'FILES.TABS.IMAGES', icon: 'pi pi-image' },
    { id: 'videos', labelKey: 'FILES.TABS.VIDEOS', icon: 'pi pi-video' },
    { id: 'audio', labelKey: 'FILES.TABS.AUDIO', icon: 'pi pi-volume-up' },
    { id: 'temp', labelKey: 'FILES.TABS.TEMP', icon: 'pi pi-clock' },
    { id: 'trash', labelKey: 'FILES.TABS.TRASH', icon: 'pi pi-trash' },
  ];

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploading = signal(false);
  protected readonly linkDialogVisible = signal(false);
  protected readonly characterDialogVisible = signal(false);
  protected readonly previewDialogVisible = signal(false);

  protected readonly linkDialogTarget = signal<FileEntity | null>(null);
  protected readonly previewFile = signal<FileEntity | null>(null);

  protected readonly active = computed<ViewTab>(() => this.files.category());
  protected readonly isTrash = computed(() => this.active() === 'trash');

  // ── Search ──────────────────────────────────────────────────────
  protected readonly searchValue = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  /** Debounced search — fires 400ms after the user stops typing. */
  protected onSearchInput(value: string): void {
    this.searchValue.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.files.setSearchQuery(value);
    }, 400);
  }

  // ── Pagination ──────────────────────────────────────────────────
  protected readonly pages = computed(() => {
    const total = this.files.totalPages();
    return total <= 1 ? [] : Array.from({ length: total }, (_, i) => i + 1);
  });

  protected readonly prevDisabled = computed(() => this.files.page() <= 1);
  protected readonly nextDisabled = computed(() => this.files.page() >= this.files.totalPages());

  protected onPrevPage(): void {
    this.files.goToPage(this.files.page() - 1);
  }

  protected onNextPage(): void {
    this.files.goToPage(this.files.page() + 1);
  }

  protected onGoToPage(page: number): void {
    this.files.goToPage(page);
  }

  ngOnInit(): void {
    this.files.load().subscribe();
  }

  protected onTabChange(id: ViewTab): void {
    this.files.setCategory(id).subscribe();
  }

  protected onFilePick(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  protected onUpload(): void {
    const f = this.selectedFile();
    if (!f) return;
    const category = this.active();
    if (category === 'trash') return;

    const payload: UploadParams = {
      file: f,
      category: category as FileCategory,
      storage: category === 'temp' ? 'temp' : 'persistent',
    };

    this.uploading.set(true);
    this.files.upload(payload).subscribe((res) => {
      this.uploading.set(false);
      if (res.error) {
        this.toast.add({
          severity: 'error',
          summary: this.t('FILES.TOAST.UPLOAD_ERROR'),
          detail: res.msg,
        });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: this.t('COMMON.OK'),
        detail: this.t('FILES.TOAST.UPLOADED'),
      });
      this.selectedFile.set(null);
    });
  }

  protected confirmDelete(file: FileEntity): void {
    this.confirm.confirm({
      header: this.t('FILES.DELETE_DIALOG.TITLE'),
      message: this.t('FILES.DELETE_DIALOG.MESSAGE', { name: file.filename }),
      acceptLabel: this.t('COMMON.DELETE'),
      rejectLabel: this.t('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.files.delete(file.id).subscribe((res) => this.notify(res)),
    });
  }

  protected onRestore(file: FileEntity): void {
    this.files.restore(file.id, file.storage).subscribe((res) => this.notify(res));
  }

  protected confirmHardDelete(file: FileEntity): void {
    this.confirm.confirm({
      header: this.t('FILES.HARD_DELETE_DIALOG.TITLE'),
      message: this.t('FILES.HARD_DELETE_DIALOG.MESSAGE', { name: file.filename }),
      acceptLabel: this.t('FILES.HARD_DELETE_DIALOG.ACCEPT'),
      rejectLabel: this.t('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.files.hardDelete(file.id).subscribe((res) => this.notify(res)),
    });
  }

  protected openLink(file: FileEntity): void {
    this.linkDialogTarget.set(file);
    this.linkDialogVisible.set(true);
  }

  protected openPreview(file: FileEntity): void {
    this.previewFile.set(file);
    this.previewDialogVisible.set(true);
  }

  protected onDownload(file: FileEntity): void {
    const url = GENERATE_URL_FILE(file.id);
    DOWNLOAD_VIDEO(url, file.filename);
  }

  protected isImage(file: FileEntity): boolean {
    return file.mimeType.startsWith('image/');
  }

  protected isVideo(file: FileEntity): boolean {
    return file.mimeType.startsWith('video/');
  }

  protected isAudio(file: FileEntity): boolean {
    return file.mimeType.startsWith('audio/');
  }

  /**
   * Toggle play/pause on a video element.
   * Bound to (click) on the <video> tag in the template.
   */
  protected togglePlay(e: Event): void {
    const video = e.currentTarget as HTMLVideoElement;
    if (!video) return;
    e.stopPropagation();
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  /**
   * Log media load errors gracefully — the card will show the broken
   * placeholder (browser handles missing source silently).
   */
  protected onMediaError(e: Event): void {
    const el = e.currentTarget as HTMLMediaElement;
    console.warn('Media failed to load:', el.src);
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private notify(res: { error: boolean; msg: string }): void {
    if (res.error) {
      this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
    } else {
      this.toast.add({ severity: 'success', summary: this.t('COMMON.OK'), detail: res.msg });
    }
  }
}
