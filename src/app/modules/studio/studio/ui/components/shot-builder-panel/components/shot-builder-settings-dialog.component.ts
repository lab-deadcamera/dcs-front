import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TranslatePipe } from '@ngx-translate/core';
import { CLAUDE_MODELS } from '@app/core/constants';
import { StudioStore } from '@app/core/stores/studio.store';
import { SkillService, Skill } from '@app/services/skill.service';

@Component({
  selector: 'app-shot-builder-settings-dialog',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, SelectModule, CheckboxModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '26rem' }"
      [header]="'STUDIO.SHOT_BUILDER.SETTINGS_TITLE' | translate"
    >
      <div class="flex flex-col gap-5 py-2">
        <!-- Model -->
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted">
            {{ 'STUDIO.SHOT_BUILDER.CLAUDE_MODEL' | translate }}
          </label>
          <p-select
            [options]="models"
            [(ngModel)]="selectedModelId"
            optionLabel="name"
            optionValue="id"
            [style]="{ width: '100%' }"
            [placeholder]="'STUDIO.SHOT_BUILDER.SELECT_MODEL' | translate"
          />
        </div>

        <!-- Skill -->
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted">
            {{ 'STUDIO.SHOT_BUILDER.SKILL_LABEL' | translate }}
          </label>
          @if (skillsLoading()) {
            <p class="text-[12px] italic text-fg-muted py-2" role="status">{{ 'STUDIO.SHOT_BUILDER.LOADING_SKILLS' | translate }}</p>
          } @else {
            <p-select
              [options]="skills()"
              [(ngModel)]="selectedSkillId"
              optionLabel="name"
              optionValue="id"
              [style]="{ width: '100%' }"
              [placeholder]="'STUDIO.SHOT_BUILDER.DEFAULT_NO_SKILL' | translate"
              [showClear]="true"
            />
          }
        </div>

        <!-- Chinese toggle -->
        <div class="flex items-center gap-3 pt-1">
          <p-checkbox
            [binary]="true"
            [(ngModel)]="generateChinese"
            inputId="zh-toggle"
          />
          <label for="zh-toggle" class="cursor-pointer text-[13px] text-fg">
            {{ 'STUDIO.SHOT_BUILDER.GENERATE_ZH' | translate: { zh: 'prompt.zh' } }}
          </label>
        </div>
        <p class="-mt-2 text-[11px] leading-snug text-fg-muted">
          {{ 'STUDIO.SHOT_BUILDER.ZH_HINT' | translate }}
        </p>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CANCEL' | translate"
            (onClick)="visibleChange.emit(false)"
          />
          <p-button
            severity="primary"
            [label]="'COMMON.APPLY' | translate"
            (onClick)="apply()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ShotBuilderSettingsDialogComponent {
  private readonly skillService = inject(SkillService);
  private readonly studio = inject(StudioStore);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  /** Emitted when Apply is clicked. */
  readonly modelChange = output<string>();
  readonly skillChange = output<string | null>();
  readonly generateChineseChange = output<boolean>();

  protected readonly models = CLAUDE_MODELS;
  protected readonly skills = signal<Skill[]>([]);
  protected readonly skillsLoading = signal(false);

  protected selectedModelId = 'claude_sonnet';
  protected selectedSkillId: string | null = null;
  protected generateChinese = true;

  /** Initialize form values when dialog opens. */
  private readonly syncOnOpen = effect(() => {
    if (!this.visible()) return;
    this.selectedModelId = 'claude_sonnet';
    this.selectedSkillId = this.studio.selectedSkill()?.id || null;
    this.generateChinese = true;

    this.skillsLoading.set(true);
    this.skillService.list().subscribe((res) => {
      this.skillsLoading.set(false);
      if (!res.error && res.data) {
        this.skills.set(res.data);
      }
    });
  });

  protected apply(): void {
    const model = this.models.find((m) => m.id === this.selectedModelId);
    if (model) {
      this.modelChange.emit(model.name);
      this.studio.model = {
        id: model.id,
        provider_id: 'claude-builtin',
        name: model.name,
        model_type: 'text',
        api_key: '',
        favorite: false,
        url: '',
        endpoint: '',
        active: true,
        created_at: '',
        updated_at: '',
        deleted_at: '',
        provider_name: 'Claude (built-in)',
      };
    }
    const skill = this.selectedSkillId
      ? this.skills().find((s) => s.id === this.selectedSkillId) ?? null
      : null;
    if (skill) {
      this.studio.setSelectedSkill({ id: skill.id, name: skill.name, description: skill.description });
      this.skillChange.emit(skill.id);
    } else {
      this.studio.setSelectedSkill(null);
      this.skillChange.emit(null);
    }
    this.generateChineseChange.emit(this.generateChinese);
    this.visibleChange.emit(false);
  }
}
