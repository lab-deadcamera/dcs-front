import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SkillService, Skill } from '@app/services/skill.service';

@Component({
  selector: 'app-skill-form-dialog',
  imports: [
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    FormsModule,
    ToastModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '36rem' }"
      [header]="skill() ? 'Edit Skill' : 'Create Skill'"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-[12px] font-bold uppercase tracking-[0.12em]">Name *</label>
          <input
            pInputText
            [(ngModel)]="name"
            placeholder="My Custom Skill"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[12px] font-bold uppercase tracking-[0.12em]">Description</label>
          <input
            pInputText
            [(ngModel)]="description"
            placeholder="Brief description of when to use this skill"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[12px] font-bold uppercase tracking-[0.12em]">System Prompt *</label>
          <textarea
            pInputTextarea
            [(ngModel)]="systemPrompt"
            placeholder="Eres un director de fotografía..."
            [rows]="10"
            class="w-full font-mono text-[12px]"
          ></textarea>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            label="Cancel"
            (onClick)="visibleChange.emit(false)"
          />
          <p-button
            label="Save"
            [disabled]="!canSave() || submitting()"
            [loading]="submitting()"
            (onClick)="save()"
          />
        </div>
      </ng-template>
    </p-dialog>

    <p-toast />
  `,
})
export class SkillFormDialogComponent {
  private readonly skillService = inject(SkillService);
  private readonly toast = inject(MessageService);

  readonly visible = input(false);
  readonly skill = input<Skill | null>(null);
  readonly visibleChange = output<boolean>();
  readonly saved = output<void>();

  protected name = '';
  protected description = '';
  protected systemPrompt = '';
  protected submitting = signal(false);

  /** Populate form fields when editing an existing skill. */
  private readonly populateOnEdit = effect(() => {
    const s = this.skill();
    if (s && this.visible()) {
      this.name = s.name;
      this.description = s.description;
      this.systemPrompt = s.system_prompt;
    }
    if (!s && this.visible()) {
      this.name = '';
      this.description = '';
      this.systemPrompt = '';
    }
  });

  protected canSave(): boolean {
    return this.name.trim().length > 0 && this.systemPrompt.trim().length > 0;
  }

  protected save(): void {
    if (!this.canSave()) return;

    this.submitting.set(true);
    const existing = this.skill();

    if (existing) {
      this.skillService.update(existing.id, {
        name: this.name.trim() || undefined,
        description: this.description.trim() || undefined,
        system_prompt: this.systemPrompt.trim() || undefined,
      }).subscribe((res) => {
        this.submitting.set(false);
        if (res.error) {
          this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
          return;
        }
        this.saved.emit();
      });
    } else {
      this.skillService.create({
        name: this.name.trim(),
        description: this.description.trim(),
        system_prompt: this.systemPrompt.trim(),
      }).subscribe((res) => {
        this.submitting.set(false);
        if (res.error) {
          this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
          return;
        }
        this.saved.emit();
      });
    }
  }
}
