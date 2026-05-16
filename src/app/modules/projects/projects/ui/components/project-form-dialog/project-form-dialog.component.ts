import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import { Project } from '../../../interfaces';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-project-form-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
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
      [style]="{ width: '28rem' }"
      [header]="
        (isEdit() ? 'PROJECTS.DIALOG.EDIT_TITLE' : 'PROJECTS.DIALOG.CREATE_TITLE') | translate
      "
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label for="project-name" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'PROJECTS.FIELDS.NAME' | translate }}
          </label>
          <input
            id="project-name"
            type="text"
            pInputText
            formControlName="name"
            data-testid="project-name-input"
          />
          <validator-errors
            [control]="form.get('name')"
            [label]="'PROJECTS.FIELDS.NAME' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="project-description"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'PROJECTS.FIELDS.DESCRIPTION' | translate }}
          </label>
          <textarea
            id="project-description"
            pInputTextarea
            formControlName="description"
            rows="3"
            data-testid="project-description-input"
          ></textarea>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CANCEL' | translate"
            (onClick)="close()"
          />
          <p-button
            [label]="(isEdit() ? 'COMMON.SAVE' : 'COMMON.CREATE') | translate"
            [disabled]="form.invalid || submitting()"
            [loading]="submitting()"
            data-testid="project-form-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ProjectFormDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly visible = input(false);
  readonly project = input<Project | null>(null);
  readonly submitting = input(false);

  readonly visibleChange = output<boolean>();
  readonly create = output<{ name: string; description?: string }>();
  readonly update = output<{ id: string; name: string; description?: string }>();

  protected readonly isEdit = computed(() => this.project() !== null);

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(500)],
  });

  private readonly syncForm = effect(() => {
    if (!this.visible()) return;
    const p = this.project();
    this.form.reset({ name: p?.name ?? '', description: p?.description ?? '' });
  });

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

    const { name, description } = this.form.value;

    if (this.isEdit()) {
      this.update.emit({ id: this.project()!.id, name, description: description || undefined });
    } else {
      this.create.emit({ name, description: description || undefined });
    }
  }
}
