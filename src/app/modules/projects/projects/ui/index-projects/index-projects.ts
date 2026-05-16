import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { Project, Scene, Take } from '../../interfaces';
import { ProjectsService } from '../../services';
import { ProjectFormDialogComponent } from '../components/project-form-dialog/project-form-dialog.component';
import { SceneFormDialogComponent } from '../components/scene-form-dialog/scene-form-dialog.component';
import { TakeFormDialogComponent } from '../components/take-form-dialog/take-form-dialog.component';

@Component({
  selector: 'app-index-projects',
  imports: [
    TranslatePipe,
    DatePipe,
    ButtonModule,
    DecimalPipe,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
    ProjectFormDialogComponent,
    SceneFormDialogComponent,
    TakeFormDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  templateUrl: './index-projects.html',
  styleUrl: './index-projects.css',
})
export class IndexProjects implements OnInit {
  private readonly service = inject(ProjectsService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  protected readonly projects = this.service.projects;
  protected readonly loading = this.service.loading;

  /** Track which project rows are expanded to show scenes. */
  protected readonly expandedProjects = signal<Record<string, boolean>>({});
  /** Track which scene rows are expanded to show takes. */
  protected readonly expandedScenes = signal<Record<string, boolean>>({});

  // Project dialog
  protected readonly projectDialogVisible = signal(false);
  protected readonly projectDialogTarget = signal<Project | null>(null);

  // Scene dialog
  protected readonly sceneDialogVisible = signal(false);
  protected readonly sceneDialogTarget = signal<Scene | null>(null);
  protected readonly scenePreSelectedProjectId = signal<string | null>(null);

  // Take dialog
  protected readonly takeDialogVisible = signal(false);
  protected readonly takeDialogTarget = signal<Take | null>(null);
  protected readonly takePreSelectedSceneId = signal<string | null>(null);
  protected readonly takePreSelectedProjectId = signal<string | null>(null);

  protected readonly submitting = signal(false);

  ngOnInit(): void {
    this.service.load().subscribe();
  }

  protected toggleProjectExpand(projectId: string): void {
    const wasExpanded = this.expandedProjects()[projectId];
    this.expandedProjects.update((map) => ({
      ...map,
      [projectId]: !map[projectId],
    }));
    // lazy-load scenes on first expand
    if (!wasExpanded) {
      this.service.loadProjectScenes(projectId);
    }
  }

  protected toggleSceneExpand(projectId: string, sceneId: string): void {
    const wasExpanded = this.expandedScenes()[sceneId];
    this.expandedScenes.update((map) => ({
      ...map,
      [sceneId]: !map[sceneId],
    }));
    // lazy-load takes on first expand
    if (!wasExpanded) {
      this.service.loadSceneTakes(projectId, sceneId);
    }
  }

  // ---------------------------------------------------------------------------
  // Project CRUD
  // ---------------------------------------------------------------------------

  protected openCreateProject(): void {
    this.projectDialogTarget.set(null);
    this.projectDialogVisible.set(true);
  }

  protected openEditProject(p: Project): void {
    this.projectDialogTarget.set(p);
    this.projectDialogVisible.set(true);
  }

  protected onCreateProject(evt: { name: string; description?: string }): void {
    this.submitting.set(true);
    this.service.createProject(evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Project created' });
      this.projectDialogVisible.set(false);
    });
  }

  protected onUpdateProject(evt: { id: string; name: string; description?: string }): void {
    this.submitting.set(true);
    this.service
      .updateProject(evt.id, { name: evt.name, description: evt.description })
      .subscribe((res) => {
        this.submitting.set(false);
        if (res.error) {
          this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
          return;
        }
        this.toast.add({ severity: 'success', summary: 'OK', detail: 'Project updated' });
        this.projectDialogVisible.set(false);
      });
  }

  protected toggleProjectActive(p: Project): void {
    this.service.updateProject(p.id, { active: !p.active }).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: `${p.name} ${p.active ? 'deactivated' : 'activated'}`,
      });
    });
  }

  protected confirmDeleteProject(p: Project): void {
    this.confirm.confirm({
      header: 'Delete Project',
      message: `Delete "${p.name}" and all its scenes and takes?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteProject(p.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Project deleted' });
        }),
    });
  }

  // ---------------------------------------------------------------------------
  // Scene CRUD
  // ---------------------------------------------------------------------------

  protected openCreateScene(projectId: string): void {
    this.sceneDialogTarget.set(null);
    this.scenePreSelectedProjectId.set(projectId);
    this.sceneDialogVisible.set(true);
  }

  protected openEditScene(s: Scene): void {
    this.sceneDialogTarget.set(s);
    this.scenePreSelectedProjectId.set(null);
    this.sceneDialogVisible.set(true);
  }

  protected onCreateScene(evt: { number: number; name: string; description?: string }): void {
    const projectId = this.scenePreSelectedProjectId();
    if (!projectId) return;

    this.submitting.set(true);
    this.service.createScene(projectId, evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Scene created' });
      this.sceneDialogVisible.set(false);
    });
  }

  protected onUpdateScene(evt: {
    id: string;
    number: number;
    name: string;
    description?: string;
  }): void {
    const projectId = this.getProjectIdForScene(evt.id);
    if (!projectId) return;

    this.submitting.set(true);
    this.service.updateScene(projectId, evt.id, evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Scene updated' });
      this.sceneDialogVisible.set(false);
    });
  }

  protected toggleSceneActive(s: Scene): void {
    const projectId = this.getProjectIdForScene(s.id);
    if (!projectId) return;

    this.service.updateScene(projectId, s.id, { active: !s.active }).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: `${s.name} ${s.active ? 'deactivated' : 'activated'}`,
      });
    });
  }

  protected confirmDeleteScene(s: Scene): void {
    const projectId = this.getProjectIdForScene(s.id);
    if (!projectId) return;

    this.confirm.confirm({
      header: 'Delete Scene',
      message: `Delete scene "${s.name}" and all its takes?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteScene(projectId, s.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Scene deleted' });
        }),
    });
  }

  // ---------------------------------------------------------------------------
  // Take CRUD
  // ---------------------------------------------------------------------------

  protected openCreateTake(projectId: string, sceneId: string): void {
    this.takeDialogTarget.set(null);
    this.takePreSelectedProjectId.set(projectId);
    this.takePreSelectedSceneId.set(sceneId);
    this.takeDialogVisible.set(true);
  }

  protected openEditTake(t: Take, projectId: string, sceneId: string): void {
    this.takeDialogTarget.set(t);
    this.takePreSelectedProjectId.set(projectId);
    this.takePreSelectedSceneId.set(sceneId);
    this.takeDialogVisible.set(true);
  }

  protected onCreateTake(evt: { number: number }): void {
    const projectId = this.takePreSelectedProjectId();
    const sceneId = this.takePreSelectedSceneId();
    if (!projectId || !sceneId) return;

    this.submitting.set(true);
    this.service.createTake(projectId, sceneId, evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Take created' });
      this.takeDialogVisible.set(false);
    });
  }

  protected confirmDeleteTake(t: Take, projectId: string, sceneId: string): void {
    this.confirm.confirm({
      header: 'Delete Take',
      message: `Delete take #${t.number}?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteTake(projectId, sceneId, t.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Take deleted' });
        }),
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getProjectIdForScene(sceneId: string): string | null {
    for (const p of this.projects()) {
      if (p.scenes.some((s) => s.scene.id === sceneId)) {
        return p.project.id;
      }
    }
    return null;
  }

  protected statusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-900/40 text-green-400';
      case 'processing':
        return 'bg-yellow-900/40 text-yellow-400';
      case 'failed':
        return 'bg-red-900/40 text-red-400';
      default:
        return 'bg-ink-700 text-fg-muted';
    }
  }
}
