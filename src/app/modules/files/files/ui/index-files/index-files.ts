import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FilesService } from '../../services';
import { FileCategory, FileEntity, UploadParams } from '../../interfaces';
import { FileLinkDialogComponent } from '../components/file-link-dialog/file-link-dialog.component';

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
  selector: 'app-index-files',
  imports: [
    TranslatePipe,
    ButtonModule,
    ConfirmDialogModule,
    TabsModule,
    ToastModule,
    FileLinkDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  templateUrl: './index-files.html',
  styleUrl: './index-files.css',
})
export class IndexFiles implements OnInit {
  protected readonly files = inject(FilesService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  protected readonly tabs: { id: ViewTab; labelKey: string; icon: string }[] = [
    { id: 'images', labelKey: 'FILES.TABS.IMAGES', icon: 'pi pi-image' },
    { id: 'videos', labelKey: 'FILES.TABS.VIDEOS', icon: 'pi pi-video' },
    { id: 'audio',  labelKey: 'FILES.TABS.AUDIO',  icon: 'pi pi-volume-up' },
    { id: 'temp',   labelKey: 'FILES.TABS.TEMP',   icon: 'pi pi-clock' },
    { id: 'trash',  labelKey: 'FILES.TABS.TRASH',  icon: 'pi pi-trash' },
  ];

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploading = signal(false);
  protected readonly linkDialogVisible = signal(false);
  protected readonly linkDialogTarget = signal<FileEntity | null>(null);

  protected readonly active = computed<ViewTab>(() => this.files.category());
  protected readonly isTrash = computed(() => this.active() === 'trash');

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
          summary: 'Upload error',
          detail: res.msg,
        });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: 'File uploaded',
      });
      this.selectedFile.set(null);
    });
  }

  protected confirmDelete(file: FileEntity): void {
    this.confirm.confirm({
      header: 'Delete file',
      message: `Move "${file.filename}" to trash?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.files.delete(file.id).subscribe((res) => this.notify(res)),
    });
  }

  protected onRestore(file: FileEntity): void {
    this.files.restore(file.id, file.storage).subscribe((res) => this.notify(res));
  }

  protected confirmHardDelete(file: FileEntity): void {
    this.confirm.confirm({
      header: 'Permanently delete',
      message: `Permanently delete "${file.filename}"? This cannot be undone.`,
      acceptLabel: 'Delete forever',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.files.hardDelete(file.id).subscribe((res) => this.notify(res)),
    });
  }

  protected openLink(file: FileEntity): void {
    this.linkDialogTarget.set(file);
    this.linkDialogVisible.set(true);
  }

  /** Image-mime files render as preview thumbs. */
  protected isImage(file: FileEntity): boolean {
    return file.mimeType.startsWith('image/');
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private notify(res: { error: boolean; msg: string }): void {
    if (res.error) {
      this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
    } else {
      this.toast.add({ severity: 'success', summary: 'OK', detail: res.msg });
    }
  }
}
