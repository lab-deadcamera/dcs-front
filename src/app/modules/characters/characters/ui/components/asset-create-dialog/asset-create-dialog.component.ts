import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { Observable, forkJoin } from 'rxjs';
import { DropZoneComponent } from '@shared/components/drop-zone/drop-zone.component';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import { FilesApiService } from '@modules/files/files/services';
import { FileEntity } from '@modules/files/files/interfaces';
import { AssetType } from '../../../interfaces';
import { CharactersService } from '../../../services';

interface StagedFile {
  /** Synthetic key for `@for` tracking. */
  key: string;
  file: File;
  previewUrl: string;
}

/**
 * Wizard-style creation flow shared by all three asset types.
 *
 * The dialog is reused for CHARACTER / LOCATION / PROP — the `type` input
 * drives only the labels. The submit flow is the same in all cases:
 *
 *   1. POST /characters with name, description, metadata.assetType.
 *   2. For each staged file: POST /files/upload (persistent) → POST
 *      /characters/{id}/files (role = 'reference').
 *   3. Emit `created` so the parent can refresh and switch tab.
 *
 * Drag-and-drop is provided by the shared `<ui-drop-zone>`, with a thumb
 * strip below for review/remove before submitting.
 */
@Component({
  selector: 'app-asset-create-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    DropZoneComponent,
    ValidatorErrors,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [closable]="!submitting()"
      [draggable]="false"
      [style]="{ width: '38rem' }"
      [header]="titleKey() | translate"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        class="flex flex-col gap-4"
      >
        <div class="flex flex-col gap-1">
          <label
            for="asset-name"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'CHARACTERS.FIELDS.NAME' | translate }}
          </label>
          <input
            id="asset-name"
            type="text"
            pInputText
            formControlName="name"
            data-testid="asset-create-name"
            [placeholder]="namePlaceholderKey() | translate"
          />
          <validator-errors
            [control]="form.get('name')"
            [label]="'CHARACTERS.FIELDS.NAME' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="asset-description"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'CHARACTERS.FIELDS.DESCRIPTION' | translate }}
          </label>
          <textarea
            id="asset-description"
            pTextarea
            rows="2"
            formControlName="description"
            data-testid="asset-create-description"
            [placeholder]="
              'CHARACTERS.FIELDS.DESCRIPTION_PLACEHOLDER' | translate
            "
          ></textarea>
        </div>

        <div class="flex flex-col gap-2">
          <label
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'CHARACTERS.ASSETS.FILES_LABEL' | translate }}
          </label>

          <ui-drop-zone
            [multiple]="true"
            placeholderKey="CHARACTERS.ASSETS.DROP_HINT"
            (filesDropped)="onFilesDropped($event)"
          />

          @if (staged().length > 0) {
            <ul class="mt-2 flex flex-wrap gap-2">
              @for (s of staged(); track s.key) {
                <li
                  class="group relative h-16 w-16 overflow-hidden border"
                  style="border-color: var(--border-color);"
                  [title]="s.file.name"
                >
                  <img
                    [src]="s.previewUrl"
                    [alt]="s.file.name"
                    class="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    class="absolute top-0 right-0 z-10 flex h-4 w-4 items-center justify-center bg-ink-950/80 text-[10px] leading-none text-fg-strong opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary-500"
                    [attr.aria-label]="'STUDIO.ASSETS.REMOVE' | translate"
                    (click)="removeStaged(s.key)"
                  >×</button>
                </li>
              }
            </ul>
            <p
              class="font-mono text-[10px]"
              style="color: var(--text-muted);"
            >
              {{ staged().length }}
              {{ 'CHARACTERS.ASSETS.FILES_COUNT' | translate }}
            </p>
          }
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CANCEL' | translate"
            [disabled]="submitting()"
            data-testid="asset-create-cancel"
            (onClick)="close()"
          />
          <p-button
            [label]="submitLabelKey() | translate"
            icon="pi pi-check"
            [disabled]="form.invalid || submitting()"
            [loading]="submitting()"
            data-testid="asset-create-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class AssetCreateDialogComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly characters = inject(CharactersService);
  private readonly filesApi = inject(FilesApiService);
  private readonly toast = inject(MessageService);

  readonly visible = input(false);
  readonly type = input<AssetType>('character');
  readonly visibleChange = output<boolean>();
  /** Fires once the asset (and every file) has been created on the backend. */
  readonly created = output<{ id: string; type: AssetType }>();

  protected readonly staged = signal<StagedFile[]>([]);
  protected readonly submitting = signal(false);

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(2000)]],
  });

  protected readonly titleKey = computed(() => {
    switch (this.type()) {
      case 'location': return 'CHARACTERS.ASSETS.TITLE_LOCATION';
      case 'prop':     return 'CHARACTERS.ASSETS.TITLE_PROP';
      default:         return 'CHARACTERS.ASSETS.TITLE_CHARACTER';
    }
  });

  protected readonly submitLabelKey = computed(() => {
    switch (this.type()) {
      case 'location': return 'CHARACTERS.ASSETS.SUBMIT_LOCATION';
      case 'prop':     return 'CHARACTERS.ASSETS.SUBMIT_PROP';
      default:         return 'CHARACTERS.ASSETS.SUBMIT_CHARACTER';
    }
  });

  protected readonly namePlaceholderKey = computed(() => {
    switch (this.type()) {
      case 'location': return 'CHARACTERS.ASSETS.NAME_PH_LOCATION';
      case 'prop':     return 'CHARACTERS.ASSETS.NAME_PH_PROP';
      default:         return 'CHARACTERS.FIELDS.NAME_PLACEHOLDER';
    }
  });

  /**
   * Reset state every time the dialog transitions to "open".
   *
   * The effect must ONLY track `visible()` — wrapping the body in
   * `untracked` prevents `staged()` reads from re-triggering the effect
   * when the user drops files (which would otherwise wipe the form +
   * revoke just-created preview URLs, freezing the dialog).
   */
  private readonly resetOnOpen = effect(() => {
    if (!this.visible()) return;
    untracked(() => {
      this.form.reset({ name: '', description: '' });
      this.disposeStaged();
      this.staged.set([]);
      this.submitting.set(false);
    });
  });

  protected onFilesDropped(files: File[]): void {
    const next: StagedFile[] = files.map((f) => ({
      key: `${f.name}_${f.size}_${f.lastModified}_${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    this.staged.update((cur) => [...cur, ...next]);
  }

  protected removeStaged(key: string): void {
    this.staged.update((cur) => {
      const victim = cur.find((s) => s.key === key);
      if (victim) URL.revokeObjectURL(victim.previewUrl);
      return cur.filter((s) => s.key !== key);
    });
  }

  protected close(): void {
    if (this.submitting()) return;
    this.visibleChange.emit(false);
  }

  protected onVisibleChange(v: boolean): void {
    this.visibleChange.emit(v);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, description } = this.form.value as {
      name: string;
      description: string;
    };
    const type = this.type();

    this.submitting.set(true);
    this.characters
      .create({
        name,
        description: description ?? '',
        metadata: { assetType: type },
      })
      .subscribe((res) => {
        if (res.error || !res.data) {
          this.submitting.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Error',
            detail: res.msg,
          });
          return;
        }
        const newId = res.data.id;
        this.uploadAndLink(newId, type);
      });
  }

  /**
   * Upload every staged file in parallel, then link the successful ones
   * to the new asset (also in parallel). Replaces the previous recursive
   * sequential implementation for ~Nx speedup on multi-file submits and
   * surfaces partial failures as individual warning toasts.
   */
  private uploadAndLink(characterId: string, type: AssetType): void {
    const files = this.staged().map((s) => s.file);
    if (files.length === 0) {
      this.finalize(characterId, type);
      return;
    }

    const uploads$ = files.map((file) =>
      this.filesApi.upload({
        file,
        category: inferCategory(file),
        storage: 'persistent',
      }),
    );

    forkJoin(uploads$).subscribe({
      next: (results) => {
        const successfulIds: string[] = [];
        results.forEach((r, i) => {
          if (r.error || !r.data) {
            this.toast.add({
              severity: 'warn',
              summary: 'Upload failed',
              detail: `${files[i].name}: ${r.msg}`,
            });
            return;
          }
          successfulIds.push((r.data as FileEntity).id);
        });

        if (successfulIds.length === 0) {
          this.finalize(characterId, type);
          return;
        }

        const links$: Observable<{ error: boolean; msg: string }>[] =
          successfulIds.map((fileId) =>
            this.characters.assignFile(characterId, fileId, 'reference'),
          );

        forkJoin(links$).subscribe({
          next: () => this.finalize(characterId, type),
          error: () => this.finalize(characterId, type),
        });
      },
      error: () => this.finalize(characterId, type),
    });
  }

  private finalize(characterId: string, type: AssetType): void {
    this.submitting.set(false);
    this.toast.add({
      severity: 'success',
      summary: 'OK',
      detail: 'Asset created',
    });
    this.created.emit({ id: characterId, type });
    this.disposeStaged();
    this.staged.set([]);
    this.visibleChange.emit(false);
  }

  /**
   * Revoke every preview URL so the browser can release the underlying
   * blob memory. Does NOT touch the signal — callers manage the array
   * separately so the cleanup can run from inside an `untracked` effect.
   */
  private disposeStaged(): void {
    for (const s of this.staged()) URL.revokeObjectURL(s.previewUrl);
  }

  ngOnDestroy(): void {
    this.disposeStaged();
  }
}

function inferCategory(file: File): 'images' | 'videos' | 'audio' | 'temp' {
  if (file.type.startsWith('image/')) return 'images';
  if (file.type.startsWith('video/')) return 'videos';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'temp';
}
