import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import {
  Character,
  CharacterFile,
  CharacterFileRole,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../../../interfaces';
import { CharactersService } from '../../../services';
import { FileEntity } from '@modules/files/files/interfaces';
import { FilesApiService } from '@app/services';

interface CharacterFormValue {
  name: string;
  description: string;
  age: number | null;
  style: string | null;
  gender: 'male' | 'female' | 'other' | null;
}

@Component({
  selector: 'app-character-form-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    ValidatorErrors,
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
        (isEdit() ? 'CHARACTERS.DIALOG.EDIT_TITLE' : 'CHARACTERS.DIALOG.CREATE_TITLE') | translate
      "
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label for="character-name" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'CHARACTERS.FIELDS.NAME' | translate }}
          </label>
          <input
            id="character-name"
            type="text"
            pInputText
            formControlName="name"
            data-testid="character-name-input"
            [placeholder]="'CHARACTERS.FIELDS.NAME_PLACEHOLDER' | translate"
          />
          <validator-errors
            [control]="form.get('name')"
            [label]="'CHARACTERS.FIELDS.NAME' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="character-description"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'CHARACTERS.FIELDS.DESCRIPTION' | translate }}
          </label>
          <textarea
            id="character-description"
            pTextarea
            rows="3"
            formControlName="description"
            data-testid="character-description-input"
            [placeholder]="'CHARACTERS.FIELDS.DESCRIPTION_PLACEHOLDER' | translate"
          ></textarea>
          <validator-errors
            [control]="form.get('description')"
            [label]="'CHARACTERS.FIELDS.DESCRIPTION' | translate"
          />
        </div>

        @if (!isEdit()) {
          <fieldset class="rounded border border-[color:var(--border-color)] p-3">
            <legend
              class="px-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-secondary)]"
            >
              {{ 'CHARACTERS.FIELDS.METADATA' | translate }}
            </legend>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="flex flex-col gap-1">
                <label
                  for="character-age"
                  class="text-[11px] font-bold uppercase tracking-[0.12em]"
                >
                  {{ 'CHARACTERS.FIELDS.AGE' | translate }}
                </label>
                <p-inputNumber
                  inputId="character-age"
                  formControlName="age"
                  data-testid="character-age-input"
                  [showButtons]="false"
                  [min]="0"
                  [max]="200"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="character-style"
                  class="text-[11px] font-bold uppercase tracking-[0.12em]"
                >
                  {{ 'CHARACTERS.FIELDS.STYLE' | translate }}
                </label>
                <input
                  id="character-style"
                  type="text"
                  pInputText
                  formControlName="style"
                  data-testid="character-style-input"
                  [placeholder]="'CHARACTERS.FIELDS.STYLE_PLACEHOLDER' | translate"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="character-gender"
                  class="text-[11px] font-bold uppercase tracking-[0.12em]"
                >
                  {{ 'CHARACTERS.FIELDS.GENDER' | translate }}
                </label>
                <p-select
                  inputId="character-gender"
                  formControlName="gender"
                  [options]="genderOptions"
                  optionLabel="label"
                  optionValue="value"
                  data-testid="character-gender-select"
                  [placeholder]="'CHARACTERS.FIELDS.GENDER_PLACEHOLDER' | translate"
                  [showClear]="true"
                />
              </div>
            </div>
          </fieldset>
        }

        @if (isEdit()) {
          <div class="border-t pt-4" style="border-color: var(--border-color);">
            <h4
              class="mb-2 text-[11px] font-bold uppercase tracking-[0.18em]"
              style="color: var(--text-secondary);"
            >
              {{ 'CHARACTERS.FILES.LINKED' | translate }}
              <span class="ml-1 font-mono" style="color: var(--text-muted);">
                ({{ links().length }})
              </span>
            </h4>

            @if (loadingLinks()) {
              <p class="text-[12px] italic" style="color: var(--text-muted);">
                {{ 'COMMON.LOADING' | translate }}
              </p>
            } @else if (links().length === 0) {
              <p class="text-[12px] italic" style="color: var(--text-muted);">
                {{ 'CHARACTERS.FILES.EMPTY' | translate }}
              </p>
            } @else {
              <ul class="mb-3 flex flex-col gap-1.5">
                @for (l of links(); track l) {
                  <li
                    class="flex items-center justify-between gap-3 border px-3 py-2 text-[12px]"
                    style="border-color: var(--border-color);"
                  >
                    <img
                      [src]="serveUrl(l.url)"
                      [alt]="l.filename || l.file_id"
                      class="h-10 w-10 flex-shrink-0 object-cover"
                      style="background: var(--surface-bg);"
                      onerror="this.style.display='none'"
                    />
                    <div class="min-w-0 flex-1">
                      <p
                        class="truncate font-mono text-[11px]"
                        [title]="l.filename || l.file_id"
                        style="color: var(--text-primary);"
                      >
                        {{ l.filename || l.file_id }}
                      </p>
                      <p
                        class="font-mono text-[10px] uppercase tracking-[0.12em]"
                        style="color: var(--primary-500);"
                      >
                        {{ l.role }}
                      </p>
                    </div>
                    <p-button
                      icon="pi pi-trash"
                      severity="danger"
                      [text]="true"
                      [rounded]="true"
                      [attr.aria-label]="'CHARACTERS.FILES.UNLINK' | translate"
                      (onClick)="onRemoveFile(l.file_id)"
                    />
                  </li>
                }
              </ul>
            }

            <div
              class="flex flex-col gap-2 border-t pt-3"
              style="border-color: var(--border-color);"
            >
              <h5
                class="text-[11px] font-bold uppercase tracking-[0.18em]"
                style="color: var(--text-secondary);"
              >
                {{ 'CHARACTERS.FILES.UPLOAD' | translate }}
              </h5>
              <input
                #fileInput
                type="file"
                accept="image/*,video/*,audio/*"
                data-testid="character-form-file-input"
                (change)="onFilePick($event)"
                class="text-[12px]"
                style="color: var(--text-secondary);"
              />
              <div class="flex items-end gap-2">
                <div class="flex flex-1 flex-col gap-1">
                  <label
                    class="text-[11px] uppercase tracking-[0.12em]"
                    style="color: var(--text-secondary);"
                  >
                    {{ 'CHARACTERS.FILES.ROLE' | translate }}
                  </label>
                  <input
                    pInputText
                    [formControl]="fileRoleCtrl"
                    data-testid="character-form-file-role"
                    [placeholder]="'CHARACTERS.FILES.ROLE_PLACEHOLDER' | translate"
                  />
                </div>
                <p-button
                  [label]="'CHARACTERS.FILES.UPLOAD_BUTTON' | translate"
                  icon="pi pi-upload"
                  [disabled]="!selectedFile() || uploading()"
                  [loading]="uploading()"
                  data-testid="character-form-file-upload"
                  (onClick)="onUploadFile()"
                />
              </div>
            </div>
          </div>
        }
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CANCEL' | translate"
            data-testid="character-form-cancel"
            (onClick)="close()"
          />
          <p-button
            [label]="(isEdit() ? 'COMMON.SAVE' : 'COMMON.CREATE') | translate"
            [disabled]="form.invalid || submitting()"
            [loading]="submitting()"
            data-testid="character-form-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class CharacterFormDialogComponent {
  @Output() updateList = new EventEmitter<void>();
  private readonly fb = inject(FormBuilder);
  private readonly characters = inject(CharactersService);
  private readonly filesApi = inject(FilesApiService);
  private readonly toast = inject(MessageService);

  readonly visible = input(false);
  readonly character = input<Character | null>(null);
  readonly submitting = input(false);

  readonly visibleChange = output<boolean>();
  readonly create = output<CreateCharacterRequest>();
  readonly update = output<{ id: string; patch: UpdateCharacterRequest }>();

  protected readonly isEdit = computed(() => this.character() !== null);

  protected readonly genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    age: [null as number | null],
    style: [null as string | null],
    gender: [null as 'male' | 'female' | 'other' | null],
  });

  // ---------------------------------------------------------------------------
  // File management state
  // ---------------------------------------------------------------------------

  protected readonly links = signal<CharacterFile[]>([]);
  protected readonly loadingLinks = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploading = signal(false);
  protected readonly fileRoleCtrl = new FormControl('reference', { nonNullable: true });

  /** Load linked files whenever the dialog opens in edit mode. */
  private readonly loadLinksOnOpen = effect(() => {
    const c = this.character();
    const open = this.visible();
    if (!open || !c) return;
    this.fetchLinks(c.id);
    this.selectedFile.set(null);
    this.fileRoleCtrl.setValue('reference');
  });

  // ---------------------------------------------------------------------------
  // File management methods
  // ---------------------------------------------------------------------------

  protected serveUrl(fileId: string): string {
    return this.filesApi.serveUrl(fileId);
  }

  protected onFilePick(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  protected onUploadFile(): void {
    const c = this.character();
    const file = this.selectedFile();
    if (!c || !file) return;

    const category = inferCategory(file);
    this.uploading.set(true);
    this.filesApi.upload({ file, category, storage: 'persistent' }).subscribe((up) => {
      if (up.error || !up.data) {
        this.uploading.set(false);
        this.toast.add({ severity: 'error', summary: 'Upload error', detail: up.msg });
        return;
      }

      const fileId = (up.data as FileEntity).id;
      const role = (this.fileRoleCtrl.value.trim() || 'reference') as CharacterFileRole;

      this.characters.assignFile(c.id, fileId, role).subscribe((link) => {
        this.uploading.set(false);
        if (link.error) {
          this.toast.add({ severity: 'error', summary: 'Link error', detail: link.msg });
          return;
        }
        this.toast.add({ severity: 'success', summary: 'OK', detail: 'File linked' });
        this.selectedFile.set(null);
        this.fileRoleCtrl.setValue('reference');
        this.fetchLinks(c.id);
        this.updateList.emit();
      });
    });
  }

  protected onRemoveFile(fileId: string): void {
    const c = this.character();
    if (!c) return;
    this.characters.unassignFile(c.id, fileId).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.links.update((list) => list.filter((l) => l.file_id !== fileId));
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'File unlinked' });
    });
  }

  private fetchLinks(characterId: string): void {
    this.loadingLinks.set(true);
    this.characters.listFiles(characterId).subscribe((res) => {
      this.loadingLinks.set(false);
      if (!res.error && res.data) this.links.set(res.data);
    });
  }

  protected close(): void {
    this.visibleChange.emit(false);
  }

  protected onVisibleChange(v: boolean): void {
    this.visibleChange.emit(v);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value as CharacterFormValue;

    if (this.isEdit()) {
      const original = this.character()!;
      const patch: UpdateCharacterRequest = {};
      if (v.name !== original.name) patch.name = v.name;
      if (v.description !== original.description) patch.description = v.description;
      this.update.emit({ id: original.id, patch });
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (v.age !== null && v.age !== undefined) metadata['age'] = v.age;
    if (v.style) metadata['style'] = v.style;
    if (v.gender) metadata['gender'] = v.gender;

    this.create.emit({
      name: v.name,
      description: v.description,
      metadata,
    });
  }
}

function inferCategory(file: File): 'images' | 'videos' | 'audio' | 'temp' {
  if (file.type.startsWith('image/')) return 'images';
  if (file.type.startsWith('video/')) return 'videos';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'temp';
}
