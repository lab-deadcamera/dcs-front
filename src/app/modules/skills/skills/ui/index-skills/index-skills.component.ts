import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SkillService, Skill } from '@app/services/skill.service';
import { SkillFormDialogComponent } from '../components/skill-form-dialog/skill-form-dialog.component';

@Component({
  selector: 'app-index-skills',
  imports: [
    TranslatePipe,
    ButtonModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    SkillFormDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  templateUrl: './index-skills.component.html',
})
export class IndexSkillsComponent implements OnInit {
  private readonly skillService = inject(SkillService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly translate = inject(TranslateService);

  /** Translate a key with optional interpolation params. */
  private t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  protected readonly skills = signal<Skill[]>([]);
  protected readonly loading = signal(true);

  protected readonly formDialogVisible = signal(false);
  protected readonly editTarget = signal<Skill | null>(null);

  ngOnInit(): void {
    this.loadSkills();
  }

  private loadSkills(): void {
    this.loading.set(true);
    this.skillService.list().subscribe((res) => {
      this.loading.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.skills.set(res.data || []);
    });
  }

  protected openCreate(): void {
    this.editTarget.set(null);
    this.formDialogVisible.set(true);
  }

  protected openEdit(skill: Skill): void {
    this.editTarget.set(skill);
    this.formDialogVisible.set(true);
  }

  protected confirmDelete(skill: Skill): void {
    this.confirm.confirm({
      header: this.t('SKILLS.DELETE_DIALOG.TITLE'),
      message: this.t('SKILLS.DELETE_DIALOG.MESSAGE', { name: skill.name }),
      acceptLabel: this.t('COMMON.DELETE'),
      rejectLabel: this.t('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.skillService.delete(skill.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: this.t('COMMON.ERROR'), detail: res.msg });
            return;
          }
          this.toast.add({
            severity: 'success',
            summary: this.t('COMMON.OK'),
            detail: this.t('SKILLS.TOAST.DELETED'),
          });
          this.loadSkills();
        }),
    });
  }

  protected onSaved(): void {
    this.formDialogVisible.set(false);
    this.loadSkills();
  }
}
