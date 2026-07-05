import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
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
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
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
      header: 'Delete Skill',
      message: `Delete "${skill.name}"? This cannot be undone.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.skillService.delete(skill.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Skill deleted' });
          this.loadSkills();
        }),
    });
  }

  protected onSaved(): void {
    this.formDialogVisible.set(false);
    this.loadSkills();
  }
}
