import {
  ChangeDetectionStrategy,
  Component,
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
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { CharactersService } from '@modules/characters/characters/services';
import { Character } from '@modules/characters/characters/interfaces';
import { FileEntity } from '../../../interfaces';

/**
 * Link an existing file to one of the existing characters.
 *
 * Loads the characters list lazily on open and lets the user pick a
 * target + role. The actual link is created via `CharactersService.assignFile`
 * so the same call path is used regardless of where the user starts
 * (from the Files page or from the Character files dialog).
 */
@Component({
  selector: 'app-file-link-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    SelectModule,
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
      [style]="{ width: '30rem' }"
      [header]="'FILES.LINK.DIALOG_TITLE' | translate"
    >
      @if (file(); as f) {
        <p
          class="mb-3 truncate font-mono text-[11px]"
          [title]="f.filename"
          style="color: var(--text-secondary);"
        >
          {{ f.filename }}
        </p>
      }

      <div class="flex flex-col gap-3">
        <label class="text-[11px] uppercase tracking-[0.12em]">
          {{ 'FILES.LINK.CHARACTER' | translate }}
        </label>
        <p-select
          [options]="characterOptions()"
          optionLabel="label"
          optionValue="value"
          [formControl]="characterCtrl"
          [filter]="true"
          filterBy="label"
          [placeholder]="'FILES.LINK.CHARACTER_PLACEHOLDER' | translate"
          data-testid="file-link-character-select"
        />

        <label class="text-[11px] uppercase tracking-[0.12em]">
          {{ 'CHARACTERS.FILES.ROLE' | translate }}
        </label>
        <input
          pInputText
          [formControl]="roleCtrl"
          data-testid="file-link-role-input"
          [placeholder]="'CHARACTERS.FILES.ROLE_PLACEHOLDER' | translate"
        />
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CANCEL' | translate"
            (onClick)="close()"
          />
          <p-button
            [label]="'FILES.LINK.SUBMIT' | translate"
            [disabled]="!characterCtrl.value || submitting()"
            [loading]="submitting()"
            data-testid="file-link-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class FileLinkDialogComponent {
  private readonly characters = inject(CharactersService);
  private readonly toast = inject(MessageService);

  readonly visible = input(false);
  readonly file = input<FileEntity | null>(null);
  readonly visibleChange = output<boolean>();

  protected readonly submitting = signal(false);
  protected readonly characterCtrl = new FormControl<string | null>(null);
  protected readonly roleCtrl = new FormControl<string>('reference', {
    nonNullable: true,
  });

  protected readonly characterOptions = signal<
    { label: string; value: string }[]
  >([]);

  /** Lazy-load the characters list whenever this dialog opens. */
  private readonly ensureCharacters = effect(() => {
    if (!this.visible()) return;
    if (this.characters.items().length === 0) {
      this.characters.load().subscribe(() => this.refreshOptions());
    } else {
      this.refreshOptions();
    }
    this.characterCtrl.setValue(null);
    this.roleCtrl.setValue('reference');
  });

  protected onVisibleChange(v: boolean): void {
    this.visibleChange.emit(v);
  }

  protected close(): void {
    this.visibleChange.emit(false);
  }

  protected onSubmit(): void {
    const f = this.file();
    const cid = this.characterCtrl.value;
    if (!f || !cid) return;
    const role = this.roleCtrl.value.trim() || 'reference';
    this.submitting.set(true);
    this.characters.assignFile(cid, f.id, role).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: 'File linked',
      });
      this.close();
    });
  }

  private refreshOptions(): void {
    this.characterOptions.set(
      this.characters.items().map((c: Character) => ({
        label: c.name,
        value: c.id,
      })),
    );
  }
}
