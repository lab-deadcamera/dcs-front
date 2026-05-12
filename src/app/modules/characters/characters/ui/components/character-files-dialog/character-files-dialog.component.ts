import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Character, CharacterFileLinkView } from '../../../interfaces';
import { CharactersService } from '../../../services';
import { FilesApiService } from '@modules/files/files/services';

/**
 * Per-character file manager dialog.
 *
 * Two responsibilities in one panel:
 *   1. List the files currently linked to the character (with role) and
 *      allow individual unassignment.
 *   2. Accept a new file upload + role, which uploads as persistent into
 *      the `images` category and immediately links it to the character.
 *
 * Files unassigned here stay in the global Files library (the link is
 * what gets removed, not the file itself).
 */
@Component({
  selector: 'app-character-files-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '36rem' }"
      [header]="
        ('CHARACTERS.FILES.DIALOG_TITLE' | translate) +
        (character() ? ' · ' + character()!.name : '')
      "
    >
      <section class="flex flex-col gap-4">
        <!-- Linked files list -->
        <div>
          <h4
            class="mb-2 text-[11px] font-bold uppercase tracking-[0.18em]"
            style="color: var(--text-secondary);"
          >
            {{ 'CHARACTERS.FILES.LINKED' | translate }}
            <span class="ml-1 font-mono" style="color: var(--text-muted);">
              ({{ links().length }})
            </span>
          </h4>

          @if (loadingList()) {
            <p class="text-[12px] italic" style="color: var(--text-muted);">
              {{ 'COMMON.LOADING' | translate }}
            </p>
          } @else if (links().length === 0) {
            <p class="text-[12px] italic" style="color: var(--text-muted);">
              {{ 'CHARACTERS.FILES.EMPTY' | translate }}
            </p>
          } @else {
            <ul class="flex flex-col gap-1.5">
              @for (l of links(); track l.fileId) {
                <li
                  class="flex items-center justify-between gap-3 border px-3 py-2 text-[12px]"
                  style="border-color: var(--border-color);"
                  [attr.data-testid]="'character-file-' + l.fileId"
                >
                  <img
                    [src]="serveUrl(l.fileId)"
                    [alt]="l.fileId"
                    class="h-10 w-10 flex-shrink-0 object-cover"
                    style="background: var(--surface-bg);"
                    onerror="this.style.display='none'"
                  />
                  <div class="min-w-0 flex-1">
                    <p
                      class="truncate font-mono text-[11px]"
                      [title]="l.fileId"
                      style="color: var(--text-primary);"
                    >
                      {{ l.fileId }}
                    </p>
                    <p
                      class="font-mono text-[10px] uppercase tracking-[0.12em]"
                      style="color: var(--primary-500);"
                    >
                      {{ l.role }}
                    </p>
                  </div>
                  <p-button
                    icon="pi pi-times"
                    severity="danger"
                    [text]="true"
                    [rounded]="true"
                    [attr.data-testid]="'character-file-unlink-' + l.fileId"
                    [attr.aria-label]="'CHARACTERS.FILES.UNLINK' | translate"
                    (onClick)="onUnlink(l.fileId)"
                  />
                </li>
              }
            </ul>
          }
        </div>

        <!-- Upload + auto-assign -->
        <div class="border-t pt-4" style="border-color: var(--border-color);">
          <h4
            class="mb-2 text-[11px] font-bold uppercase tracking-[0.18em]"
            style="color: var(--text-secondary);"
          >
            {{ 'CHARACTERS.FILES.UPLOAD' | translate }}
          </h4>

          <div class="flex flex-col gap-2">
            <input
              #fileInput
              type="file"
              accept="image/*,video/*,audio/*"
              data-testid="character-file-input"
              (change)="onFilePick($event)"
              class="text-[12px]"
              style="color: var(--text-secondary);"
            />

            <label class="text-[11px] uppercase tracking-[0.12em]">
              {{ 'CHARACTERS.FILES.ROLE' | translate }}
            </label>
            <input
              pInputText
              [formControl]="roleCtrl"
              data-testid="character-file-role-input"
              [placeholder]="'CHARACTERS.FILES.ROLE_PLACEHOLDER' | translate"
            />

            <p-button
              [label]="'CHARACTERS.FILES.UPLOAD_BUTTON' | translate"
              icon="pi pi-upload"
              [disabled]="!selectedFile() || uploading()"
              [loading]="uploading()"
              data-testid="character-file-upload-submit"
              (onClick)="onUpload()"
            />
          </div>
        </div>
      </section>

      <ng-template pTemplate="footer">
        <p-button
          severity="secondary"
          [text]="true"
          [label]="'COMMON.CLOSE' | translate"
          data-testid="character-files-close"
          (onClick)="close()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class CharacterFilesDialogComponent {
  private readonly characters = inject(CharactersService);
  private readonly filesApi = inject(FilesApiService);
  private readonly toast = inject(MessageService);

  readonly visible = input(false);
  readonly character = input<Character | null>(null);
  readonly visibleChange = output<boolean>();

  protected readonly links = signal<CharacterFileLinkView[]>([]);
  protected readonly loadingList = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploading = signal(false);
  protected readonly roleCtrl = new FormControl('reference', {
    nonNullable: true,
  });

  protected readonly hasCharacter = computed(() => this.character() !== null);

  /** Refresh the link list whenever the dialog opens for a character. */
  private readonly refreshOnOpen = effect(() => {
    const c = this.character();
    const open = this.visible();
    if (!open || !c) return;
    this.fetchLinks(c.id);
    this.selectedFile.set(null);
    this.roleCtrl.setValue('reference');
  });

  protected serveUrl(fileId: string): string {
    return this.filesApi.serveUrl(fileId);
  }

  protected onFilePick(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  protected onUpload(): void {
    const c = this.character();
    const file = this.selectedFile();
    if (!c || !file) return;

    const category = inferCategory(file);
    this.uploading.set(true);
    this.filesApi
      .upload({ file, category, storage: 'persistent' })
      .subscribe((up) => {
        if (up.error || !up.data) {
          this.uploading.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Upload error',
            detail: up.msg,
          });
          return;
        }
        const fileId = up.data.id;
        const role = this.roleCtrl.value.trim() || 'reference';

        this.characters.assignFile(c.id, fileId, role).subscribe((link) => {
          this.uploading.set(false);
          if (link.error) {
            this.toast.add({
              severity: 'error',
              summary: 'Link error',
              detail: link.msg,
            });
            return;
          }
          this.toast.add({
            severity: 'success',
            summary: 'OK',
            detail: 'File linked',
          });
          this.selectedFile.set(null);
          this.fetchLinks(c.id);
        });
      });
  }

  protected onUnlink(fileId: string): void {
    const c = this.character();
    if (!c) return;
    this.characters.unassignFile(c.id, fileId).subscribe((res) => {
      if (res.error) {
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: res.msg,
        });
        return;
      }
      this.links.update((list) => list.filter((l) => l.fileId !== fileId));
    });
  }

  protected close(): void {
    this.visibleChange.emit(false);
  }

  protected onVisibleChange(v: boolean): void {
    this.visibleChange.emit(v);
  }

  private fetchLinks(characterId: string): void {
    this.loadingList.set(true);
    this.characters.listFiles(characterId).subscribe((res) => {
      this.loadingList.set(false);
      if (!res.error && res.data) this.links.set(res.data);
    });
  }
}

function inferCategory(file: File): 'images' | 'videos' | 'audio' | 'temp' {
  if (file.type.startsWith('image/')) return 'images';
  if (file.type.startsWith('video/')) return 'videos';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'temp';
}
