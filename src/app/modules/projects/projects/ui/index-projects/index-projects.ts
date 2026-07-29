import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { Chapter, Project, Scene, Shot } from '../../interfaces';
import { ProjectsService } from '../../services';
import { ProjectFormDialogComponent } from '../components/project-form-dialog/project-form-dialog.component';
import { ChapterFormDialogComponent } from '../components/chapter-form-dialog/chapter-form-dialog.component';
import { SceneFormDialogComponent } from '../components/scene-form-dialog/scene-form-dialog.component';
import { ShotFormDialogComponent } from '../components/shot-form-dialog/shot-form-dialog.component';
import { ButtonModule } from 'primeng/button';
import { SessionStore } from '@app/core/stores/session.store';
import { LEVEL_ROL } from '@app/core/constants';
import { SceneAssignmentComponent } from '@modules/director/director/ui/scene-assignment/scene-assignment';

@Component({
  selector: 'app-index-projects',
  imports: [
    TranslatePipe,
    ButtonModule,
    DecimalPipe,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
    DialogModule,
    ProjectFormDialogComponent,
    ChapterFormDialogComponent,
    SceneFormDialogComponent,
    ShotFormDialogComponent,
    SceneAssignmentComponent,
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
  private readonly session = inject(SessionStore);
  protected readonly projects = this.service.projects;
  protected readonly loading = this.service.loading;

  /** Track which project rows are expanded to show episodes. */
  protected readonly expandedProjects = signal<Record<string, boolean>>({});
  /** Track which episode rows are expanded to show scenes. */
  protected readonly expandedChapters = signal<Record<string, boolean>>({});
  /** Track which scene rows are expanded to show shots. */
  protected readonly expandedScenes = signal<Record<string, boolean>>({});

  // Project dialog
  protected readonly projectDialogVisible = signal(false);
  protected readonly projectDialogTarget = signal<Project | null>(null);

  // Chapter dialog
  protected readonly chapterDialogVisible = signal(false);
  protected readonly chapterDialogTarget = signal<Chapter | null>(null);
  protected readonly chapterPreSelectedProjectId = signal<string | null>(null);

  // Scene dialog
  protected readonly sceneDialogVisible = signal(false);
  protected readonly sceneDialogTarget = signal<Scene | null>(null);
  protected readonly scenePreSelectedChapterId = signal<string | null>(null);
  protected readonly scenePreSelectedProjectId = signal<string | null>(null);
  // Shot dialog
  protected readonly shotDialogVisible = signal(false);
  protected readonly shotDialogTarget = signal<Shot | null>(null);
  protected readonly shotPreSelectedProjectId = signal<string | null>(null);
  protected readonly shotPreSelectedChapterId = signal<string | null>(null);
  protected readonly shotPreSelectedSceneId = signal<string | null>(null);

  // Scene Assignment dialog
  protected readonly assignResourcesDialogVisible = signal(false);
  protected readonly assignResourcesProjectId = signal('');
  protected readonly assignResourcesProjectName = signal('');
  protected readonly assignResourcesSceneId = signal('');
  protected readonly assignResourcesSceneNumber = signal(0);
  protected readonly assignResourcesSceneName = signal('');

  protected readonly submitting = signal(false);
  isDirectorOrAdmin = signal(false);

  ngOnInit(): void {
    this.service.load().subscribe();
    this.isDirectorOrAdmin.set(this.session.roleLevel() <= LEVEL_ROL.DIRECTOR);
  }

  protected toggleProjectExpand(projectId: string): void {
    const wasExpanded = this.expandedProjects()[projectId];
    this.expandedProjects.update((map) => ({
      ...map,
      [projectId]: !map[projectId],
    }));
    // lazy-load chapters on first expand
    if (!wasExpanded) {
      this.service.loadProjectChapters(projectId);
    }
  }

  protected toggleChapterExpand(projectId: string, chapterId: string): void {
    const wasExpanded = this.expandedChapters()[chapterId];
    this.expandedChapters.update((map) => ({
      ...map,
      [chapterId]: !map[chapterId],
    }));
    // lazy-load scenes on first expand
    if (!wasExpanded) {
      this.service.loadChapterScenes(projectId, chapterId);
    }
  }

  protected toggleSceneExpand(projectId: string, chapterId: string, sceneId: string): void {
    const wasExpanded = this.expandedScenes()[sceneId];
    this.expandedScenes.update((map) => ({
      ...map,
      [sceneId]: !map[sceneId],
    }));
    // lazy-load shots on first expand
    if (!wasExpanded) {
      this.service.loadSceneShots(projectId, chapterId, sceneId);
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
      message: `Delete "${p.name}" and all its episodes and scenes?`,
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
  // Chapter (Episode) CRUD
  // ---------------------------------------------------------------------------

  protected openCreateChapter(projectId: string): void {
    this.chapterDialogTarget.set(null);
    this.chapterPreSelectedProjectId.set(projectId);
    this.chapterDialogVisible.set(true);
  }

  protected openEditChapter(c: Chapter): void {
    this.chapterDialogTarget.set(c);
    this.chapterPreSelectedProjectId.set(null);
    this.chapterDialogVisible.set(true);
  }

  protected onCreateChapter(evt: { number: number; name: string; description?: string }): void {
    const projectId = this.chapterPreSelectedProjectId();
    if (!projectId) return;

    this.submitting.set(true);
    this.service.createChapter(projectId, evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Episode created' });
      this.chapterDialogVisible.set(false);
    });
  }

  protected onUpdateChapter(evt: {
    id: string;
    number: number;
    name: string;
    description?: string;
  }): void {
    const projectId = this.getProjectIdForChapter(evt.id);
    if (!projectId) return;

    this.submitting.set(true);
    this.service.updateChapter(projectId, evt.id, evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Episode updated' });
      this.chapterDialogVisible.set(false);
    });
  }

  protected toggleChapterActive(c: Chapter): void {
    const projectId = this.getProjectIdForChapter(c.id);
    if (!projectId) return;

    this.service.updateChapter(projectId, c.id, { active: !c.active }).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: `${c.name} ${c.active ? 'deactivated' : 'activated'}`,
      });
    });
  }

  protected confirmDeleteChapter(c: Chapter): void {
    const projectId = this.getProjectIdForChapter(c.id);
    if (!projectId) return;

    this.confirm.confirm({
      header: 'Delete Episode',
      message: `Delete episode "${c.name}" and all its scenes?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteChapter(projectId, c.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Episode deleted' });
        }),
    });
  }

  // ---------------------------------------------------------------------------
  // Scene CRUD
  // ---------------------------------------------------------------------------

  protected openCreateScene(projectId: string, chapterId: string): void {
    this.sceneDialogTarget.set(null);
    this.scenePreSelectedProjectId.set(projectId);
    this.scenePreSelectedChapterId.set(chapterId);
    this.sceneDialogVisible.set(true);
  }

  protected openEditScene(s: Scene): void {
    this.sceneDialogTarget.set(s);
    this.scenePreSelectedProjectId.set(null);
    this.scenePreSelectedChapterId.set(null);
    this.sceneDialogVisible.set(true);
  }

  protected onCreateScene(evt: { number: number; name: string; description?: string }): void {
    const projectId = this.scenePreSelectedProjectId();
    const chapterId = this.scenePreSelectedChapterId();
    if (!projectId || !chapterId) return;

    this.submitting.set(true);
    this.service.createScene(projectId, chapterId, evt).subscribe((res) => {
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
    const ids = this.getParentIdsForScene(evt.id);
    if (!ids) return;
    const { projectId, chapterId } = ids;

    this.submitting.set(true);
    this.service.updateScene(projectId, chapterId, evt.id, evt).subscribe((res) => {
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
    const ids = this.getParentIdsForScene(s.id);
    if (!ids) return;
    const { projectId, chapterId } = ids;

    this.service.updateScene(projectId, chapterId, s.id, { active: !s.active }).subscribe((res) => {
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

  protected openAssignResources(scene: Scene, projectName: string): void {
    this.assignResourcesProjectId.set(scene.project_id);
    this.assignResourcesProjectName.set(projectName);
    this.assignResourcesSceneId.set(scene.id);
    this.assignResourcesSceneNumber.set(scene.number);
    this.assignResourcesSceneName.set(scene.name);
    this.assignResourcesDialogVisible.set(true);
  }

  protected confirmDeleteScene(s: Scene): void {
    const ids = this.getParentIdsForScene(s.id);
    if (!ids) return;
    const { projectId, chapterId } = ids;

    this.confirm.confirm({
      header: 'Delete Scene',
      message: `Delete scene "${s.name}"?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteScene(projectId, chapterId, s.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Scene deleted' });
        }),
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getProjectIdForChapter(chapterId: string): string | null {
    for (const p of this.projects()) {
      if (p.chapters.some((c) => c.chapter.id === chapterId)) {
        return p.project.id;
      }
    }
    return null;
  }

  
  // ---------------------------------------------------------------------------
  // Shot CRUD
  // ---------------------------------------------------------------------------

  protected openEditShot(s: Shot): void {
    const ids = this.getParentIdsForShot(s.id);
    if (!ids) return;
    this.shotDialogTarget.set(s);
    this.shotPreSelectedProjectId.set(ids.projectId);
    this.shotPreSelectedChapterId.set(ids.chapterId);
    this.shotPreSelectedSceneId.set(ids.sceneId);
    this.shotDialogVisible.set(true);
  }

  protected onUpdateShot(evt: {
    id: string;
    number: number;
    name: string;
    description?: string;
  }): void {
    const ids = this.getParentIdsForShot(evt.id);
    if (!ids) return;
    const { projectId, chapterId, sceneId } = ids;

    this.submitting.set(true);
    this.service.updateShot(projectId, chapterId, sceneId, evt.id, evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: "error", summary: "Error", detail: res.msg });
        return;
      }
      this.toast.add({ severity: "success", summary: "OK", detail: "Shot updated" });
      this.shotDialogVisible.set(false);
    });
  }

  private getParentIdsForShot(shotId: string): { projectId: string; chapterId: string; sceneId: string } | null {
    for (const p of this.projects()) {
      for (const c of p.chapters) {
        for (const s of c.scenes) {
          if (s.shots.some((sh) => sh.shot.id === shotId)) {
            return { projectId: p.project.id, chapterId: c.chapter.id, sceneId: s.scene.id };
          }
        }
      }
    }
    return null;
  }

  private getParentIdsForScene(sceneId: string): { projectId: string; chapterId: string } | null {
    for (const p of this.projects()) {
      for (const c of p.chapters) {
        if (c.scenes.some((s) => s.scene.id === sceneId)) {
          return { projectId: p.project.id, chapterId: c.chapter.id };
        }
      }
    }
    return null;
  }
}
