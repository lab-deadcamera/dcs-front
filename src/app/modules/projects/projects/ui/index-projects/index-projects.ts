import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { Chapter, Project, Scene, Shot, Take } from '../../interfaces';
import { ProjectsService } from '../../services';
import { ProjectFormDialogComponent } from '../components/project-form-dialog/project-form-dialog.component';
import { ChapterFormDialogComponent } from '../components/chapter-form-dialog/chapter-form-dialog.component';
import { SceneFormDialogComponent } from '../components/scene-form-dialog/scene-form-dialog.component';
import { ShotFormDialogComponent } from '../components/shot-form-dialog/shot-form-dialog.component';
import { TakeFormDialogComponent } from '../components/take-form-dialog/take-form-dialog.component';
import { ButtonModule } from 'primeng/button';
import { SessionStore } from '@app/core/stores/session.store';
import { LEVEL_ROL } from '@app/core/constants';

@Component({
  selector: 'app-index-projects',
  imports: [
    TranslatePipe,
    ButtonModule,
    DecimalPipe,
    TooltipModule,
    RouterLink,
    ConfirmDialogModule,
    ToastModule,
    ProjectFormDialogComponent,
    ChapterFormDialogComponent,
    SceneFormDialogComponent,
    ShotFormDialogComponent,
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
  private readonly session = inject(SessionStore);
  protected readonly projects = this.service.projects;
  protected readonly loading = this.service.loading;

  /** Track which project rows are expanded to show chapters. */
  protected readonly expandedProjects = signal<Record<string, boolean>>({});
  /** Track which chapter rows are expanded to show scenes. */
  protected readonly expandedChapters = signal<Record<string, boolean>>({});
  /** Track which scene rows are expanded to show shots. */
  protected readonly expandedScenes = signal<Record<string, boolean>>({});
  /** Track which shot rows are expanded to show takes. */
  protected readonly expandedShots = signal<Record<string, boolean>>({});

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
  protected readonly shotPreSelectedSceneId = signal<string | null>(null);
  protected readonly shotPreSelectedProjectId = signal<string | null>(null);
  protected readonly shotPreSelectedChapterId = signal<string | null>(null);

  // Take dialog
  protected readonly takeDialogVisible = signal(false);
  protected readonly takeDialogTarget = signal<Take | null>(null);
  protected readonly takePreSelectedProjectId = signal<string | null>(null);
  protected readonly takePreSelectedChapterId = signal<string | null>(null);
  protected readonly takePreSelectedSceneId = signal<string | null>(null);
  protected readonly takePreSelectedShotId = signal<string | null>(null);

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

  protected toggleShotExpand(projectId: string, chapterId: string, sceneId: string, shotId: string): void {
    const wasExpanded = this.expandedShots()[shotId];
    this.expandedShots.update((map) => ({
      ...map,
      [shotId]: !map[shotId],
    }));
    // lazy-load takes on first expand
    if (!wasExpanded) {
      this.service.loadShotTakes(projectId, chapterId, sceneId, shotId);
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
      message: `Delete "${p.name}" and all its chapters, scenes, shots, and takes?`,
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
  // Chapter CRUD
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
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Chapter created' });
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
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Chapter updated' });
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
      header: 'Delete Chapter',
      message: `Delete chapter "${c.name}" and all its scenes, shots, and takes?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteChapter(projectId, c.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Chapter deleted' });
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

  protected confirmDeleteScene(s: Scene): void {
    const ids = this.getParentIdsForScene(s.id);
    if (!ids) return;
    const { projectId, chapterId } = ids;

    this.confirm.confirm({
      header: 'Delete Scene',
      message: `Delete scene "${s.name}" and all its shots and takes?`,
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
  // Shot CRUD
  // ---------------------------------------------------------------------------

  protected openCreateShot(projectId: string, chapterId: string, sceneId: string): void {
    this.shotDialogTarget.set(null);
    this.shotPreSelectedProjectId.set(projectId);
    this.shotPreSelectedChapterId.set(chapterId);
    this.shotPreSelectedSceneId.set(sceneId);
    this.shotDialogVisible.set(true);
  }

  protected openEditShot(sh: Shot): void {
    this.shotDialogTarget.set(sh);
    this.shotPreSelectedProjectId.set(null);
    this.shotPreSelectedChapterId.set(null);
    this.shotPreSelectedSceneId.set(null);
    this.shotDialogVisible.set(true);
  }

  protected onCreateShot(evt: { number: number; name: string; description?: string }): void {
    const projectId = this.shotPreSelectedProjectId();
    const chapterId = this.shotPreSelectedChapterId();
    const sceneId = this.shotPreSelectedSceneId();
    if (!projectId || !chapterId || !sceneId) return;

    this.submitting.set(true);
    this.service.createShot(projectId, chapterId, sceneId, evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Shot created' });
      this.shotDialogVisible.set(false);
    });
  }

  protected onUpdateShot(evt: {
    id: string;
    number: number;
    name: string;
    description?: string;
  }): void {
    const ids = this.getParentIdsForShot(evt.id);
    if (!ids) return;

    this.submitting.set(true);
    this.service.updateShot(ids.projectId, ids.chapterId, ids.sceneId, evt.id, evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Shot updated' });
      this.shotDialogVisible.set(false);
    });
  }

  protected toggleShotActive(sh: Shot): void {
    const ids = this.getParentIdsForShot(sh.id);
    if (!ids) return;

    this.service.updateShot(ids.projectId, ids.chapterId, ids.sceneId, sh.id, { active: !sh.active }).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: `${sh.name} ${sh.active ? 'deactivated' : 'activated'}`,
      });
    });
  }

  protected confirmDeleteShot(sh: Shot): void {
    const ids = this.getParentIdsForShot(sh.id);
    if (!ids) return;

    this.confirm.confirm({
      header: 'Delete Shot',
      message: `Delete shot "${sh.name}" and all its takes?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteShot(ids.projectId, ids.chapterId, ids.sceneId, sh.id).subscribe((res) => {
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'OK', detail: 'Shot deleted' });
        }),
    });
  }

  // ---------------------------------------------------------------------------
  // Take CRUD
  // ---------------------------------------------------------------------------

  protected openCreateTake(projectId: string, chapterId: string, sceneId: string, shotId: string): void {
    this.takeDialogTarget.set(null);
    this.takePreSelectedProjectId.set(projectId);
    this.takePreSelectedChapterId.set(chapterId);
    this.takePreSelectedSceneId.set(sceneId);
    this.takePreSelectedShotId.set(shotId);
    this.takeDialogVisible.set(true);
  }

  protected openEditTake(t: Take, projectId: string, chapterId: string, sceneId: string, shotId: string): void {
    this.takeDialogTarget.set(t);
    this.takePreSelectedProjectId.set(projectId);
    this.takePreSelectedChapterId.set(chapterId);
    this.takePreSelectedSceneId.set(sceneId);
    this.takePreSelectedShotId.set(shotId);
    this.takeDialogVisible.set(true);
  }

  protected onCreateTake(evt: { number: number }): void {
    const projectId = this.takePreSelectedProjectId();
    const chapterId = this.takePreSelectedChapterId();
    const sceneId = this.takePreSelectedSceneId();
    const shotId = this.takePreSelectedShotId();
    if (!projectId || !chapterId || !sceneId || !shotId) return;

    this.submitting.set(true);
    this.service.createTake(projectId, chapterId, sceneId, shotId, evt).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Take created' });
      this.takeDialogVisible.set(false);
    });
  }

  protected confirmDeleteTake(t: Take, projectId: string, chapterId: string, sceneId: string, shotId: string): void {
    this.confirm.confirm({
      header: 'Delete Take',
      message: `Delete take #${t.number}?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteTake(projectId, chapterId, sceneId, shotId, t.id).subscribe((res) => {
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

  private getProjectIdForChapter(chapterId: string): string | null {
    for (const p of this.projects()) {
      if (p.chapters.some((c) => c.chapter.id === chapterId)) {
        return p.project.id;
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
