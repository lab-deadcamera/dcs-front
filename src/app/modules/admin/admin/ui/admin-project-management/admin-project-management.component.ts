import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { Project } from '@modules/projects/projects/interfaces';
import { ProjectsApiService } from '@modules/projects/projects/services';

@Component({
  selector: 'app-admin-project-management',
  imports: [
    TranslatePipe,
    ButtonModule,
    DatePipe,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  template: `
    <section class="px-6 py-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-[18px] font-bold uppercase tracking-[0.12em]">{{ 'PROJECTS.TITLE' | translate }}</h1>
          <p class="mt-1 text-[12px] text-fg-muted">
            {{ 'ADMIN.PROJECTS.SUBTITLE' | translate }}
          </p>
        </div>
        <p-button
          [label]="'PROJECTS.NEW_PROJECT' | translate"
          icon="pi pi-plus"
          (onClick)="openCreateDialog()"
        />
      </div>

      <!-- Loading -->
      @if (loading()) {
        <p class="py-8 text-center text-[13px] italic text-fg-muted">
          {{ 'COMMON.LOADING' | translate }}
        </p>
      }

      <!-- Empty -->
      @if (!loading() && projects().length === 0) {
        <div class="flex flex-col items-center gap-4 py-16">
          <i class="pi pi-video text-4xl text-fg-muted"></i>
          <p class="text-[13px] text-fg-muted">{{ 'ADMIN.PROJECTS.EMPTY' | translate }}</p>
        </div>
      }

      <!-- Table -->
      @if (projects().length > 0) {
        <div class="overflow-x-auto rounded border" style="border-color: var(--border-color)">
          <table class="w-full text-[12px]">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                <th class="px-3 py-2 font-medium">{{ 'TABLE.NAME' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'TABLE.DESCRIPTION' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'ADMIN.PROJECTS.COL_CHAPTERS' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'TABLE.STATUS' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'TABLE.CREATED_AT' | translate }}</th>
                <th class="w-36 px-3 py-2 font-medium">{{ 'TABLE.ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (p of projects(); track p.id) {
                <tr class="border-t" style="border-color: var(--border-color)">
                  <td class="max-w-40 truncate px-3 py-2 font-semibold" [title]="p.name">
                    {{ p.name }}
                  </td>
                  <td class="max-w-60 truncate px-3 py-2 text-fg-muted" [title]="p.description">
                    {{ p.description || '—' }}
                  </td>
                  <td class="px-3 py-2 font-mono">{{ p.chapter_count }}</td>
                  <td class="px-3 py-2">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                      [class.bg-green-900]="p.active"
                      [class.text-green-400]="p.active"
                      [class.bg-ink-700]="!p.active"
                      [class.text-fg-muted]="!p.active"
                    >
                      {{ p.active ? ('GLOBAL.STATUS.ACTIVE' | translate) : ('GLOBAL.STATUS.INACTIVE' | translate) }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 font-mono text-fg-muted">
                    {{ p.created_at | date: 'dd/MM/yy HH:mm' }}
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex items-center gap-1">
                      <p-button
                        icon="pi pi-pencil"
                        severity="secondary"
                        [text]="true"
                        [rounded]="true"
                        [pTooltip]="'COMMON.EDIT' | translate"
                        (onClick)="openEditDialog(p)"
                      />
                      <p-button
                        [icon]="p.active ? 'pi pi-pause-circle' : 'pi pi-play-circle'"
                        severity="secondary"
                        [text]="true"
                        [rounded]="true"
                        [pTooltip]="p.active ? ('ADMIN.PROJECTS.DEACTIVATE' | translate) : ('ADMIN.PROJECTS.ACTIVATE' | translate)"
                        (onClick)="toggleActive(p)"
                      />
                      <p-button
                        icon="pi pi-trash"
                        severity="danger"
                        [text]="true"
                        [rounded]="true"
                        [pTooltip]="'COMMON.DELETE' | translate"
                        (onClick)="confirmDelete(p)"
                      />
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class AdminProjectManagementComponent implements OnInit {
  private readonly api = inject(ProjectsApiService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);

  protected readonly projects = signal<Project[]>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    this.loadProjects();
  }

  private loadProjects(): void {
    this.loading.set(true);
    this.api.listProjectsAdmin().subscribe((res) => {
      this.loading.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.i18n.instant('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.projects.set(res.data ?? []);
    });
  }

  protected openCreateDialog(): void {
    const name = prompt('Project name:');
    if (!name?.trim()) return;
    const description = prompt('Description (optional):');
    this.api.createProject({ name: name.trim(), description: description?.trim() || undefined }).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.i18n.instant('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: this.i18n.instant('COMMON.OK'),
        detail: this.i18n.instant('PROJECTS.TOAST.CREATED'),
      });
      this.loadProjects();
    });
  }

  protected openEditDialog(p: Project): void {
    const name = prompt('Project name:', p.name);
    if (!name?.trim()) return;
    const description = prompt('Description:', p.description);
    this.api.updateProject(p.id, { name: name.trim(), description: description?.trim() || undefined }).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.i18n.instant('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: this.i18n.instant('COMMON.OK'),
        detail: this.i18n.instant('PROJECTS.TOAST.UPDATED'),
      });
      this.loadProjects();
    });
  }

  protected toggleActive(p: Project): void {
    this.api.updateProject(p.id, { active: !p.active }).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: this.i18n.instant('COMMON.ERROR'), detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: this.i18n.instant('COMMON.OK'),
        detail: this.i18n.instant(
          p.active ? 'PROJECTS.TOAST.DEACTIVATED' : 'PROJECTS.TOAST.ACTIVATED',
          { name: p.name },
        ),
      });
      this.loadProjects();
    });
  }

  protected confirmDelete(p: Project): void {
    this.confirm.confirm({
      header: this.i18n.instant('PROJECTS.DELETE_DIALOG.TITLE'),
      message: this.i18n.instant('ADMIN.PROJECTS.DELETE_MESSAGE', { name: p.name }),
      acceptLabel: this.i18n.instant('COMMON.DELETE'),
      rejectLabel: this.i18n.instant('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.deleteProject(p.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: this.i18n.instant('COMMON.ERROR'), detail: res.msg });
            return;
          }
          this.toast.add({
            severity: 'success',
            summary: this.i18n.instant('COMMON.OK'),
            detail: this.i18n.instant('PROJECTS.TOAST.DELETED'),
          });
          this.loadProjects();
        });
      },
    });
  }
}
