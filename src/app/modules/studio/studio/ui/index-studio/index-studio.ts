import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudioApiService } from '@app/services/studio-api.service';
import { interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { HeroComponent } from '@shared/components/hero/hero.component';
import { ViewerComponent } from '@shared/components/viewer/viewer.component';
import { PromptBuilderComponent } from '@shared/components/prompt-builder/prompt-builder.component';
import { TakesReelComponent } from '@shared/components/takes-reel/takes-reel.component';
import { ProncerComponent } from '@shared/components/proncer/proncer.component';
import { OutputFormatComponent } from '@shared/components/output-format/output-format.component';
import { CharacterAssetsComponent } from '@shared/components/character-assets/character-assets.component';
import { RatingComponent } from '@shared/components/rating/rating.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import {
  BreadcrumbOption,
  StudioBreadcrumbComponent,
} from '../components/studio-breadcrumb/studio-breadcrumb.component';
import { SessionStore } from '@app/core/stores/session.store';
import { ModelAssetSync } from '@core/interfaces/seedance.interface';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TakeChecklistComponent } from '@shared/components/take-checklist/take-checklist.component';
import { MAX_BATCH_COUNT, UsedAssetKind } from '@core/interfaces/studio.models';
import { StudioStore } from '@app/core/stores/studio.store';
import { GenerationLogsService, ModelService, VideoGeneratorService } from '@app/services';
import { ProjectsApiService } from '@modules/projects/projects/services';
import { Project } from '@modules/projects/projects/interfaces';
import {
  GeneratedClip,
  VideoGenerateContentItem,
  VideoGenerateRequest,
  VideoGenerateResponse,
} from '@app/core/interfaces';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Splitter } from 'primeng/splitter';
import { LEVEL_ROL } from '@app/core/constants';
import { ShotBuilderPanelComponent } from '../components/shot-builder-panel/shot-builder-panel.component';

/** localStorage key for breadcrumb selection persistence. */
const LS_KEY = 'studio-breadcrumb-selection';

interface StoredNavSelection {
  projectId: string;
  chapterId: string | null;
  sceneId: string | null;
  shotId: string | null;
  sceneNumber?: number;
  sceneName?: string;
}

/** Visual progress per status — backend reports no % during running, so we fake it. */
const PROGRESS_QUEUED = 10;
const PROGRESS_RUNNING_START = 30;
const PROGRESS_RUNNING_STEP = 10;
const PROGRESS_RUNNING_CAP = 85;

/** Backend polling cadence per the studio-generation use-case doc. */
const POLL_INTERVAL_MS = 3000;

/** Model selected by default when the studio loads. */
const DEFAULT_MODEL_NAME = 'Dreamina-Seedance-2-0-Gallery';

/** Tolerant model-name match — ignores case, spaces, dots and dashes. */
function normalizeModelName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

@Component({
  selector: 'app-index-studio',
  imports: [
    HeroComponent,
    ViewerComponent,
    PromptBuilderComponent,
    TakesReelComponent,
    ProncerComponent,
    OutputFormatComponent,
    CharacterAssetsComponent,
    RatingComponent,
    ToastModule,
    FooterComponent,
    StudioBreadcrumbComponent,
    TakeChecklistComponent,
    ButtonModule,
    DialogModule,
    TooltipModule,
    DatePipe,
    Splitter,
    ShotBuilderPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './index-studio.html',
  styleUrl: './index-studio.css',
  providers: [ConfirmationService, MessageService],
})
export class IndexStudio implements OnInit {
  protected readonly studio = inject(StudioStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly modelService = inject(ModelService);
  private readonly videoGenerator = inject(VideoGeneratorService);
  private readonly genLogs = inject(GenerationLogsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(MessageService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly studioApi = inject(StudioApiService);

  // ── Responsive layout (splitter on lg+, stacked on mobile) ──────────

  protected readonly isLargeScreen = signal(false);

  private readonly promptBuilder = viewChild(PromptBuilderComponent);

  constructor() {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 64rem)');
    this.isLargeScreen.set(mq.matches);
    const handler = (e: MediaQueryListEvent) => this.isLargeScreen.set(e.matches);
    mq.addEventListener('change', handler);
    this.destroyRef.onDestroy(() => {
      mq.removeEventListener('change', handler);
      this.studio.resetStudio();
    });
  }

  /** Forwarder for <app-character-assets (assetPicked)>. */
  protected onAssetPickedFromCharacters(kind: UsedAssetKind): void {
    this.promptBuilder()?.addReferenceForKind(kind);
  }

  /** Forwarder for <app-cinematography (presetChanged)>. */
  protected onPresetChangedFromCinematography(change: { remove?: string; add?: string }): void {
    this.promptBuilder()?.applyPresetChange(change);
  }

  // ── Preview dialog ──────────────────────────────────────────────────

  protected readonly previewDialogVisible = signal(false);
  protected readonly previewLoading = signal(false);
  protected readonly previewData = signal<Record<string, unknown> | null>(null);
  protected readonly previewError = signal<string | null>(null);

  protected readonly previewDataPretty = computed(() => {
    const d = this.previewData();
    return d ? JSON.stringify(d, null, 2) : '';
  });

  // ── Sync dialog ─────────────────────────────────────────────────────

  protected readonly syncDialogVisible = signal(false);
  protected readonly syncedAssets = signal<ModelAssetSync[]>([]);
  protected readonly syncLoading = signal(false);

  protected readonly syncBtnPos = signal({ x: 16, y: 200 });
  private dragging = false;
  private dragStart = { x: 0, y: 0, btnX: 0, btnY: 0 };
  private moved = false;

  protected onSyncBtnDown(e: MouseEvent | TouchEvent): void {
    this.dragging = true;
    this.moved = false;
    const pos = this.syncBtnPos();
    if ('touches' in e) {
      this.dragStart = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        btnX: pos.x,
        btnY: pos.y,
      };
    } else {
      this.dragStart = { x: e.clientX, y: e.clientY, btnX: pos.x, btnY: pos.y };
    }
  }

  protected onSyncBtnMove(e: MouseEvent | TouchEvent): void {
    if (!this.dragging) return;
    e.preventDefault();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = cx - this.dragStart.x;
    const dy = cy - this.dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.moved = true;
    this.syncBtnPos.set({ x: this.dragStart.btnX + dx, y: this.dragStart.btnY + dy });
  }

  protected onSyncBtnUp(): void {
    this.dragging = false;
  }

  protected onSyncBtnClick(): void {
    if (this.moved) return;

    this.openSyncDialog();
  }

  protected openSyncDialog(): void {
    const model = this.studio.modelCode();
    if (!model?.id) {
      this.toast.add({
        severity: 'warn',
        summary: 'Sync',
        detail: 'Select a model first',
        life: 3000,
      });
      return;
    }
    this.syncLoading.set(true);
    this.syncDialogVisible.set(true);
    this.genLogs.getSyncedAssets(model.id).subscribe((res) => {
      this.syncLoading.set(false);
      if (!res.error && res.data) {
        this.syncedAssets.set(res.data);
      } else {
        this.toast.add({ severity: 'error', summary: 'Sync', detail: res.msg, life: 3000 });
      }
    });
  }

  /** Scene code prefix for the take checklist. */
  protected readonly scenePrefix = computed(() => this.studio.sceneCode());

  /** True when the current take already has a video (re-generation mode). */
  protected readonly isRegenerating = this.studio.currentTakeHasVideo;

  /** Solo SUPER_ADMIN (level 0) ve el botón de Vista previa del payload. */
  protected readonly isSuperAdmin = computed(() => this.sessionStore.roleLevel() === 0);

  /** True when user is director or admin (level ≤ 2). */
  protected readonly isDirectorOrAdmin = computed(
    () => this.sessionStore.roleLevel() <= LEVEL_ROL.DIRECTOR,
  );

  // ── Breadcrumb state (data managed here, displayed by breadcrumb component) ──

  protected readonly navProjects = signal<Project[]>([]);
  protected readonly navChapters = signal<
    { id: string; number: number; name: string; label: string }[]
  >([]);
  protected readonly navScenes = signal<
    { id: string; number: number; name: string; label: string }[]
  >([]);
  protected readonly navShots = signal<
    { id: string; number: number; name: string; label: string }[]
  >([]);
  protected readonly navSelectedProjectId = signal<string | null>(null);
  protected readonly navSelectedChapterId = signal<string | null>(null);
  protected readonly navSelectedSceneId = signal<string | null>(null);
  protected readonly navSelectedShotId = signal<string | null>(null);
  protected readonly navLoadingProjects = signal(false);
  protected readonly navLoadingChapters = signal(false);
  protected readonly navLoadingScenes = signal(false);
  protected readonly navLoadingShots = signal(false);

  /** Selected scene object for display in the new-shot dialog. */
  protected readonly navSelectedScene = signal<{ id: string; number: number; name: string } | null>(
    null,
  );

  /** Resolved names from the selected IDs for the shot-builder-panel header. */
  protected readonly navSelectedProjectName = computed(
    () => this.navProjects().find((p) => p.id === this.navSelectedProjectId())?.name ?? '',
  );
  protected readonly navSelectedChapterName = computed(
    () => this.navChapters().find((c) => c.id === this.navSelectedChapterId())?.name ?? '',
  );
  protected readonly navSelectedSceneName = computed(
    () => this.navScenes().find((s) => s.id === this.navSelectedSceneId())?.name ?? '',
  );

  /** True while restoring a previous selection from localStorage. */
  private readonly restoring = signal(false);

  /** Saved selection to restore (populated before restoring cascade). */
  private savedNav: StoredNavSelection | null = null;

  // ── Breadcrumb event handlers ──────────────────────────────────────────

  protected loadProjects(): void {
    this.navLoadingProjects.set(true);
    this.projectsApi.listProjects().subscribe((res) => {
      this.navLoadingProjects.set(false);
      if (!res.error && res.data) {
        this.navProjects.set(res.data.sort((a, b) => a.name.localeCompare(b.name)));
        // If restoring, trigger the cascade after projects load
        if (this.restoring() && this.savedNav) {
          this.restoreAfterProjects();
        }
      }
    });
  }

  protected onNavProjectChange(projectId: string | null): void {
    this.studio.resetStudio();
    this.navChapters.set([]);
    this.navScenes.set([]);
    this.navShots.set([]);
    this.navSelectedChapterId.set(null);
    this.navSelectedSceneId.set(null);
    this.navSelectedScene.set(null);
    this.navSelectedShotId.set(null);
    this.persistNav();
    if (projectId) {
      this.loadChapters(projectId);
    }
  }

  /** Load chapters for a project and auto-select if appropriate. */
  private loadChapters(projectId: string): void {
    this.navLoadingChapters.set(true);
    this.projectsApi.listChapters(projectId).subscribe((res) => {
      this.navLoadingChapters.set(false);
      if (!res.error && res.data) {
        const items = res.data
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => ({
            id: c.id,
            number: c.number,
            name: c.name,
            label: `EP${String(c.number).padStart(2, '0')} \u2014 ${c.name}`,
          }));
        this.navChapters.set(items);
        this.autoSelectChapter(items);
      }
    });
  }

  /** After chapters load, select the right one (restored, auto, or none). */
  private autoSelectChapter(items: BreadcrumbOption[]): void {
    const saved = this.savedNav;
    if (this.restoring() && saved?.chapterId) {
      const match = items.find((c) => c.id === saved.chapterId);
      if (match) {
        this.navSelectedChapterId.set(match.id);
        this.handleChapterSelected(match.id);
        return;
      }
    }
    if (!this.restoring() && items.length === 1) {
      this.navSelectedChapterId.set(items[0].id);
      this.handleChapterSelected(items[0].id);
    }
  }

  /** Called when a chapter is selected (user or auto). */
  private handleChapterSelected(chapterId: string): void {
    this.studio.resetStudio();
    this.navScenes.set([]);
    this.navShots.set([]);
    this.navSelectedSceneId.set(null);
    this.navSelectedScene.set(null);
    this.navSelectedShotId.set(null);
    this.persistNav();
    const projectId = this.navSelectedProjectId();
    if (projectId) {
      this.loadScenes(projectId, chapterId);
    }
  }

  protected onNavChapterChange(chapterId: string | null): void {
    if (chapterId) {
      this.handleChapterSelected(chapterId);
    }
  }

  /** Load scenes for a chapter and auto-select if appropriate. */
  private loadScenes(projectId: string, chapterId: string): void {
    this.navLoadingScenes.set(true);
    this.projectsApi.listScenes(projectId, chapterId).subscribe((res) => {
      this.navLoadingScenes.set(false);
      if (!res.error && res.data) {
        const items = res.data
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((s) => ({
            id: s.id,
            number: s.number,
            name: s.name,
            label: `SC${String(s.number).padStart(2, '0')} \u2014 ${s.name}`,
          }));
        this.navScenes.set(items);
        this.autoSelectScene(items);
      }
    });
  }

  /** After scenes load, select the right one (restored, auto, or none). */
  private autoSelectScene(items: BreadcrumbOption[]): void {
    const saved = this.savedNav;
    if (this.restoring() && saved?.sceneId) {
      const match = items.find((s) => s.id === saved.sceneId);
      if (match) {
        this.navSelectedSceneId.set(match.id);
        this.handleSceneSelected(match.id);
        return;
      }
    }
    if (!this.restoring() && items.length === 1) {
      this.navSelectedSceneId.set(items[0].id);
      this.handleSceneSelected(items[0].id);
    }
  }

  /** Called when a scene is selected (user or auto). */
  private handleSceneSelected(sceneId: string): void {
    this.studio.resetStudio();
    this.navShots.set([]);
    this.navSelectedShotId.set(null);
    this.persistNav();
    const scene = this.navScenes().find((s) => s.id === sceneId);
    if (scene) {
      this.navSelectedScene.set({ id: scene.id, number: scene.number, name: scene.name });
    }
    const projectId = this.navSelectedProjectId();
    const chapterId = this.navSelectedChapterId();
    if (projectId && chapterId) {
      this.loadShots(projectId, chapterId, sceneId);

      // Load scene assignments so the shot builder has access to characters,
      // presets and free assets before generating
      this.studioApi.getSceneAssignments(projectId, chapterId, sceneId).subscribe({
        next: (res) => {
          if (res.data) this.studio.setSceneAssignments(res.data);
        },
        error: () => {
          /* assignments not critical */
        },
      });
    }
  }

  protected onNavSceneChange(sceneId: string | null): void {
    if (sceneId) {
      this.handleSceneSelected(sceneId);
    } else {
      this.studio.resetStudio();
      this.navShots.set([]);
      this.navSelectedShotId.set(null);
      this.navSelectedScene.set(null);
      this.persistNav();
    }
  }

  /** Load shots for a scene and auto-select if appropriate. */
  private loadShots(projectId: string, chapterId: string, sceneId: string): void {
    this.navLoadingShots.set(true);
    this.projectsApi.listShots(projectId, chapterId, sceneId).subscribe((res) => {
      this.navLoadingShots.set(false);
      if (!res.error && res.data) {
        const items = res.data.map((sh) => ({
          id: sh.id,
          number: sh.number,
          name: sh.name,
          label: `SH${String(sh.number).padStart(2, '0')} \u2014 ${sh.name}`,
        }));
        this.navShots.set(items);
        this.autoSelectShot(items);
      }
    });
  }

  /** After shots load, select the right one (restored, auto, or none). */
  private autoSelectShot(items: BreadcrumbOption[]): void {
    const saved = this.savedNav;
    if (this.restoring() && saved?.shotId) {
      const match = items.find((sh) => sh.id === saved.shotId);
      if (match) {
        this.navSelectedShotId.set(match.id);
        this.onNavShotChange(match.id);
        return;
      }
    }
    if (!this.restoring() && items.length === 1) {
      this.navSelectedShotId.set(items[0].id);
      this.onNavShotChange(items[0].id);
    }
  }

  protected onNavShotChange(shotId: string | null): void {
    if (!shotId) {
      this.studio.resetStudio();
      this.persistNav();
      return;
    }
    const shot = this.navShots().find((s) => s.id === shotId);
    if (shot) {
      this.startSessionWithShot(shot);
      this.persistNav();
    }
  }

  /** Reload shots list for the current scene. */
  private reloadShots(): void {
    const projectId = this.navSelectedProjectId();
    const chapterId = this.navSelectedChapterId();
    const sceneId = this.navSelectedSceneId();
    if (!projectId || !chapterId || !sceneId) return;

    this.navLoadingShots.set(true);
    this.projectsApi.listShots(projectId, chapterId, sceneId).subscribe((res) => {
      this.navLoadingShots.set(false);
      if (!res.error && res.data) {
        this.navShots.set(
          res.data.map((sh) => ({
            id: sh.id,
            number: sh.number,
            name: sh.name,
            label: `SH${String(sh.number).padStart(2, '0')} \u2014 ${sh.name}`,
          })),
        );
        // Auto-select if the previously selected shot is now in the list
        const saved = this.savedNav;
        if (saved?.shotId) {
          const match = this.navShots().find((sh) => sh.id === saved.shotId);
          if (match) {
            this.navSelectedShotId.set(match.id);
            this.onNavShotChange(match.id);
          }
        }
      }
    });
  }

  /** Persist current breadcrumb selection to localStorage. */
  private persistNav(): void {
    const projectId = this.navSelectedProjectId();
    if (!projectId) {
      localStorage.removeItem(LS_KEY);
      return;
    }
    const scene = this.navSelectedScene();
    const selection: StoredNavSelection = {
      projectId,
      chapterId: this.navSelectedChapterId(),
      sceneId: this.navSelectedSceneId(),
      shotId: this.navSelectedShotId(),
      sceneNumber: scene?.number,
      sceneName: scene?.name,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(selection));
  }

  /** Start restoring a previous selection from localStorage. */
  private startRestoring(): void {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as StoredNavSelection;
      if (!saved.projectId) return;
      this.savedNav = saved;
      this.restoring.set(true);
      // Projects load is already in progress (called from ngOnInit),
      // so restoration continues in loadProjects() callback.
    } catch {
      localStorage.removeItem(LS_KEY);
    }
  }

  /** Continue restoration after projects have loaded. */
  private restoreAfterProjects(): void {
    const saved = this.savedNav;
    if (!saved) return;

    // Find the project in the loaded list
    const project = this.navProjects().find((p) => p.id === saved.projectId);
    if (!project) {
      // Saved project no longer exists — bail out
      this.restoring.set(false);
      this.savedNav = null;
      localStorage.removeItem(LS_KEY);
      return;
    }

    // Select the project (this will cascade to load chapters)
    this.navSelectedProjectId.set(saved.projectId);
    this.loadChapters(saved.projectId);
  }

  /** Initialize session for a given shot. */
  private startSessionWithShot(shot: { id: string; number: number; name: string }): void {
    const projectId = this.navSelectedProjectId();
    const chapterId = this.navSelectedChapterId();
    const sceneId = this.navSelectedSceneId();
    const scene = this.navSelectedScene();
    if (!projectId || !chapterId || !sceneId || !scene) return;

    const currentUser = this.sessionStore.user();
    const handle = currentUser?.handle || currentUser?.email || 'anonymous';

    const project = this.navProjects().find((p) => p.id === projectId);
    const chapter = this.navChapters().find((c) => c.id === chapterId);
    const sceneCode = `SC${String(scene.number).padStart(2, '0')}`;

    // Clear previous used assets before loading a new shot
    this.studio.clearUsedAssets();

    this.projectsApi.listTakes(projectId, chapterId, sceneId, shot.id).subscribe((takesRes) => {
      const backendTakes = takesRes.error || !takesRes.data ? [] : takesRes.data;
      const totalTakes = Math.max(
        1,
        backendTakes.length > 0 ? Math.max(...backendTakes.map((t) => t.number)) : 5,
      );

      this.studio.initStudioSession({
        projectId,
        chapterId,
        shotId: shot.id,
        sceneId,
        sceneCode,
        projectName: project?.name,
        chapterName: chapter?.name,
        sceneName: scene.name,
        shotName: shot.name,
        userHandle: handle,
        totalTakes,
        backendTakes,
      });

      this.sessionStore.initSession({
        email: currentUser?.email ?? '',
        handle,
      });

      // Load the shot's description (pre-prompt) and restore it.
      // Whichever async call finishes last triggers the slot-based
      // asset registration so both the description and scene assignments
      // are guaranteed to be available.
      this.projectsApi.getShot(projectId, chapterId, sceneId, shot.id).subscribe({
        next: (res) => {
          if (!res.error && res.data?.shot.description) {
            this.studio.setRawDescription(res.data.shot.description);
          }

          // Restore output format from the shot's persisted values
          if (!res.error && res.data?.shot) {
            const backendShot = res.data.shot;
            const patch: Record<string, unknown> = {};
            if (backendShot.aspect_ratio) {
              patch['aspectRatio'] = backendShot.aspect_ratio;
            }
            if (backendShot.duration_seconds && backendShot.duration_seconds > 0) {
              patch['durationSeconds'] = backendShot.duration_seconds;
            }
            if (Object.keys(patch).length > 0) {
              this.studio.patchOutput(patch as any);
            }
          }

          // If assignments arrived first, register now
          if (this.studio.assignmentsLoaded()) {
            this.studio.registerUsedAssetsFromDescription(this.studio.rawDescription() || '');
          }
        },
      });

      this.studioApi.getSceneAssignments(projectId, chapterId, sceneId).subscribe({
        next: (res) => {
          if (res.data) {
            this.studio.setSceneAssignments(res.data);
            // If description arrived first, register now
            const desc = this.studio.rawDescription();
            if (desc) {
              this.studio.registerUsedAssetsFromDescription(desc);
            }
          }
        },
        error: () => {
          /* assignments not critical */
        },
      });

    });
  }

  // ── Called from breadcrumb "Create & Open" button ───────────────────

  private readonly breadcrumbComponent = viewChild(StudioBreadcrumbComponent);

  protected onBreadcrumbCreateShot(shotName: string): void {
    const projectId = this.navSelectedProjectId();
    const chapterId = this.navSelectedChapterId();
    const sceneId = this.navSelectedSceneId();
    const scene = this.navSelectedScene();
    if (!projectId || !chapterId || !sceneId || !scene) return;

    // Load existing shots to determine the next shot number
    this.projectsApi.listShots(projectId, chapterId, sceneId).subscribe((shotsRes) => {
      const existingShots = shotsRes.error || !shotsRes.data ? [] : shotsRes.data;
      const nextShotNumber =
        existingShots.length > 0 ? Math.max(...existingShots.map((s) => s.number)) + 1 : 1;

      // Create the new shot
      this.projectsApi
        .createShot(projectId, chapterId, sceneId, {
          number: nextShotNumber,
          name: shotName,
        })
        .subscribe((shotRes) => {
          if (shotRes.error || !shotRes.data) {
            this.toast.add({
              severity: 'error',
              summary: 'Error',
              detail: shotRes.msg || 'Failed to create shot',
            });
            return;
          }

          const newShot = shotRes.data;

          // Reload shots list so the dropdown shows the new shot
          this.reloadShots();

          // Set the shot in the breadcrumb model so the dropdown selects it
          this.navSelectedShotId.set(newShot.id);

          // Reset the breadcrumb dialog
          this.breadcrumbComponent()?.resetNewShotDialog();

          // Start session with the newly created shot
          this.startSessionWithShot({
            id: newShot.id,
            number: newShot.number,
            name: newShot.name,
          });
        });
    });
  }

  /** Reload scene assignments after the assignment dialog changes them. */
  protected onSceneAssignmentsChanged(): void {
    const projectId = this.navSelectedProjectId();
    const chapterId = this.navSelectedChapterId();
    const sceneId = this.navSelectedSceneId();
    if (!projectId || !chapterId || !sceneId) return;

    this.studioApi.getSceneAssignments(projectId, chapterId, sceneId).subscribe({
      next: (res) => {
        if (res.data) this.studio.setSceneAssignments(res.data);
      },
      error: () => {
        /* not critical */
      },
    });
  }

  /** Handle the shots saved event from the shot builder panel. */
  protected onShotsSaved(event: {
    projectId: string;
    chapterId: string;
    sceneId: string;
    firstShotId: string;
    firstShotDescription: string;
  }): void {
    // Reload shots so the breadcrumb shows the new list
    this.reloadShots();

    // Set the shot in the breadcrumb model so it gets selected
    this.navSelectedShotId.set(event.firstShotId);

    // Start session with the newly created first shot
    this.startSessionWithShot({
      id: event.firstShotId,
      number: 1,
      name: event.firstShotDescription.slice(0, 40) || 'Shot 1',
    });

    // Restore the first shot's description as the pre-prompt
    if (event.firstShotDescription) {
      this.studio.setRawDescription(event.firstShotDescription);
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  ngOnInit(): void {
    // The studio has no persistent memory. Every page load starts fresh.
    // The breadcrumb is the entry gate: the user must explicitly select
    // project → episode → scene → shot before the studio activates.
    this.studio.resetStudio();

    // Default the studio to the Dreamina-Seedance-2-0-Gallery model so the
    // user can start generating without picking one first. It stays selected
    // (surviving breadcrumb navigation, see StudioStore.resetStudio) until the
    // user changes it via the model picker. Fall back to the account favorite
    // if that model isn't available for this account.
    this.modelService.getAllModels('video').subscribe((res) => {
      const preferred = res.data?.find(
        (m) => normalizeModelName(m.name) === normalizeModelName(DEFAULT_MODEL_NAME),
      );
      if (preferred) {
        this.studio.model = preferred;
        return;
      }
      this.modelService.getFavorite().subscribe((fav) => {
        if (!fav.error && fav.data) this.studio.model = fav.data;
      });
    });
    this.loadProjects();
    this.startRestoring();
  }

  /**
   * Forwarded from the takes-reel's `(selectTake)` output.
   * Loads the take's video into the viewer.
   */
  protected onSelectTake(takeIndex: number): void {
    this.studio.selectTake(takeIndex);

    const take = this.studio.currentTake();
    if (take?.video_local_url) {
      this.studio.pushClip({
        id: crypto.randomUUID(),
        prompt: '',
        videoLocalUrl: take.video_local_url,
        createdAt: Date.now(),
        durationSeconds: 5,
        resolution: '480p',
        takeIndex,
        rating: take.rating,
      });
    }
  }

  /**
   * Forwarded from the takes-reel's `(toggleActive)` output.
   */
  protected onToggleTakeActive(takeId: string, takeIndex: number): void {
    const projectId = this.studio.projectId();
    const chapterId = this.studio.chapterId();
    const sceneId = this.studio.sceneId();
    const shotId = this.studio.shotId();
    if (!projectId || !chapterId || !sceneId || !shotId) return;

    this.projectsApi
      .toggleTakeActive(projectId, chapterId, sceneId, shotId, takeId)
      .subscribe((res) => {
        if (!res.error && res.data) {
          this.studio.selectTake(takeIndex);
        }
      });
  }

  /**
   * Dispatch one independent generation request per `batchCount`.
   */
  protected onGenerate(): void {
    if (!this.studio.projectId() || !this.studio.sceneId()) {
      this.toast.add({
        summary: 'Error',
        detail: 'Debes seleccionar un proyecto y una escena antes de generar',
        severity: 'error',
        life: 3000,
      });
      return;
    }

    const text = this.studio.rawDescription().trim();
    if (!text) {
      this.toast.add({
        summary: 'Error',
        detail: 'Debes escribir un prompt antes de generar',
        severity: 'error',
        life: 3000,
      });
      return;
    }
    const count = Math.max(1, Math.min(MAX_BATCH_COUNT, this.studio.output().batchCount || 1));
    for (let i = 0; i < count; i++) {
      this.runOneGeneration(text, i + 1, count);
    }
  }

  /**
   * Dry-run the same payload `onGenerate` would send.
   */
  protected onPreview(): void {
    if (!this.isSuperAdmin()) return;
    if (!this.studio.projectId() || !this.studio.sceneId()) {
      this.toast.add({
        summary: 'Error',
        detail: 'Debes seleccionar un proyecto y una escena antes de previsualizar',
        severity: 'error',
        life: 3000,
      });
      return;
    }
    const text = this.studio.rawDescription().trim();
    if (!text) {
      this.toast.add({
        summary: 'Error',
        detail: 'Debes escribir un prompt antes de previsualizar',
        severity: 'error',
        life: 3000,
      });
      return;
    }

    const payload = this.buildPayload(text);
    this.previewData.set(null);
    this.previewError.set(null);
    this.previewLoading.set(true);
    this.previewDialogVisible.set(true);

    this.videoGenerator
      .preview(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.previewLoading.set(false);
        if (res.error) {
          this.previewError.set(res.msg);
          return;
        }
        this.previewData.set(res.data ?? {});
      });
  }

  /**
   * Submit one task to the studio API and follow its lifecycle.
   */
  private runOneGeneration(prompt: string, index: number, total: number): void {
    const label = total > 1 ? `${index}/${total}` : undefined;
    const takeIndex = this.studio.currentTake()?.index;
    const localId = this.studio.startGeneration(label, takeIndex);

    if (!this.studio.modelCode()) {
      this.toast.add({
        summary: 'Error',
        detail: 'Debes seleccionar un modelo',
        severity: 'error',
        life: 3000,
      });
      return;
    }

    const source = this.buildSourceSnapshot(prompt);
    const payload = this.buildPayload(prompt);
    this.videoGenerator
      .generate(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.toast.add({
          summary: 'Respuesta del servidor',
          detail: res.msg,
          severity: res.error ? 'error' : 'success',
          life: 7000,
        });
        if (res.error || !res.data) {
          this.studio.failGeneration(localId);
          return;
        }
        const initial = res.data;

        this.studio.setGenerationTaskId(localId, initial.taskId);
        const modelCode = this.studio.modelCode();
        if (modelCode) {
          this.studio.restorePendingTask(localId, initial.taskId, modelCode.name);
        }

        if (initial.status === 'succeeded') {
          this.finishWithClip(localId, initial, source);
          return;
        }
        if (initial.status === 'failed') {
          this.studio.failGeneration(localId);
          return;
        }
        this.studio.updateGenerationProgress(
          localId,
          initial.status === 'running' ? PROGRESS_RUNNING_START : PROGRESS_QUEUED,
        );
        this.pollUntilTerminal(initial.taskId, localId, source);
      });
  }

  /**
   * Poll `/studio/status/{taskId}` every 3 seconds until terminal.
   */
  private pollUntilTerminal(
    taskId: string,
    localId: string,
    source: GeneratedClip['source'],
  ): void {
    let pollCount = 0;
    interval(POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.videoGenerator.status(taskId)),
        takeWhile(
          (res) =>
            !res.error &&
            !!res.data &&
            (res.data.status === 'queued' || res.data.status === 'running'),
          true,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res.error || !res.data) {
          this.studio.failGeneration(localId);
          this.toast.add({
            summary: 'Error de generación',
            detail: res.msg || 'Error al consultar el estado de la tarea',
            severity: 'error',
            life: 5000,
          });
          return;
        }
        const task = res.data;
        pollCount += 1;
        if (task.status === 'running') {
          const next = Math.min(
            PROGRESS_RUNNING_CAP,
            PROGRESS_RUNNING_START + pollCount * PROGRESS_RUNNING_STEP,
          );
          this.studio.updateGenerationProgress(localId, next);
        } else if (task.status === 'succeeded') {
          this.finishWithClip(localId, task, source);
        } else if (task.status === 'failed') {
          this.studio.failGeneration(localId);
          this.toast.add({
            summary: 'Generación fallida',
            detail: 'La tarea no pudo completarse',
            severity: 'error',
            life: 5000,
          });
        }
      });
  }

  /**
   * Materialize a `GeneratedClip` from the first video output.
   */
  private finishWithClip(
    localId: string,
    task: VideoGenerateResponse,
    source: GeneratedClip['source'],
  ): void {
    const out = task.outputs.find((o) => o.type === 'video') ?? task.outputs[0];
    if (!out?.url) {
      this.studio.failGeneration(localId);
      this.toast.add({
        summary: 'Error',
        detail: 'No se recibió un video del servidor',
        severity: 'error',
        life: 5000,
      });
      return;
    }
    const output = this.studio.output();
    const clip: GeneratedClip = {
      id: crypto.randomUUID(),
      prompt: this.studio.rawDescription(),
      videoLocalUrl: out.localUrl || '',
      createdAt: Date.now(),
      durationSeconds: output.durationSeconds,
      resolution: output.resolution,
      source,
    };
    this.studio.completeGeneration(localId, clip);

    this.persistGeneration(clip, task.taskId);

    this.playNotificationSound();

    this.toast.add({
      summary: 'Generación completada',
      detail: 'El video se ha generado correctamente',
      severity: 'success',
      life: 5000,
    });
  }

  /** Play a short chime to alert the user that a video is ready in the viewer. */
  private playNotificationSound(): void {
    if (typeof Audio === 'undefined') return;
    const audio = new Audio('assets/audio/notification.wav');
    audio.volume = 0.6;
    audio.play().catch(() => {
      // Autoplay may be blocked until first user gesture — silently ignore.
    });
  }

  /**
   * Persist the generation result as a new take in the backend, then
   * reload the takes list so the reel reflects the new entry.
   */
  private persistGeneration(clip: GeneratedClip, taskId?: string): void {
    const projectId = this.studio.projectId();
    const chapterId = this.studio.chapterId();
    const sceneId = this.studio.sceneId();
    const shotId = this.studio.shotId();
    if (!projectId || !chapterId || !sceneId || !shotId || !clip.videoLocalUrl) return;

    this.reloadTakesForShot();
  }

  /** Reload takes from the backend for the current shot and update the store. */
  private reloadTakesForShot(): void {
    const projectId = this.studio.projectId();
    const chapterId = this.studio.chapterId();
    const sceneId = this.studio.sceneId();
    const shotId = this.studio.shotId();
    if (!projectId || !chapterId || !sceneId || !shotId) return;

    this.projectsApi.listTakes(projectId, chapterId, sceneId, shotId).subscribe((res) => {
      if (res.error || !res.data) return;

      const backendTakes = res.data;
      const totalTakes = Math.max(
        1,
        backendTakes.length > 0 ? Math.max(...backendTakes.map((t) => t.number)) : 5,
      );

      const currentUser = this.sessionStore.user();
      const handle = currentUser?.handle || currentUser?.email || 'anonymous';

      this.studio.initStudioSession({
        projectId,
        chapterId,
        shotId,
        sceneId,
        sceneCode: this.studio.sceneCode(),
        projectName: this.studio.projectName(),
        chapterName: this.studio.chapterName(),
        sceneName: this.studio.sceneName(),
        shotName: this.studio.shotName(),
        userHandle: handle,
        totalTakes,
        backendTakes,
      });
    });
  }

  /**
   * Build the request body from the current prompt + output + assets state.
   */
  private buildPayload(text: string): VideoGenerateRequest {
    const output = this.studio.output();
    const refs = this.collectReferenceAssets();
    const hints = this.buildFrameHints();
    const finalText = hints ? `${hints} ${text}` : text;

    const content: VideoGenerateContentItem[] = [{ type: 'text', text: finalText }];
    for (const ref of refs) {
      content.push({
        type: ref.type,
        id: ref.fileId,
        name: ref.filename,
        text: ref.tag,
      });
    }

    const takeIndex = this.studio.takes().length + 1;
    return {
      model: this.studio.modelCode()?.name ?? '',
      content,
      ratio: output.aspectRatio,
      duration: output.durationSeconds,
      camerafixed: false,
      seed: '',
      quality: 'standard',
      quantity: 1,
      watermark: false,
      resolution: output.resolution,
      generate_audio: output.sound,
      image_mode: 'PIL',
      project_id: this.studio.projectId() ?? '',
      project_name: this.studio.projectName(),
      scene_id: this.studio.sceneId() ?? '',
      scene_code: this.studio.sceneCode(),
      shot_id: this.studio.shotId() ?? '',
      take_number: takeIndex,
      user_name: this.sessionStore.user()?.handle ?? '',
      user_id: this.sessionStore.authUser()?.id ?? 0,
    };
  }

  /**
   * Auto-generated text prepended to the prompt so the model knows which
   * reference image anchors the first/last frame.
   */
  private buildFrameHints(): string {
    const first = this.studio.firstFrame();
    const last = this.studio.lastFrame();
    if (first && last) return 'The video starts on Image 1 and ends on Image 2.';
    if (first) return 'The video starts on Image 1.';
    if (last) return 'The video ends on Image 1.';
    return '';
  }

  /**
   * Flatten every reference source into a single deduped list.
   */
  private collectReferenceAssets(): Array<{
    fileId: string;
    filename: string;
    type: 'image' | 'video' | 'audio';
    tag: string;
  }> {
    const out: Array<{
      fileId: string;
      filename: string;
      type: 'image' | 'video' | 'audio';
      tag: string;
    }> = [];
    const seen = new Set<string>();
    const push = (
      fileId: string,
      filename: string,
      type: 'image' | 'video' | 'audio',
      tag: string,
    ): void => {
      if (seen.has(fileId)) return;
      seen.add(fileId);
      out.push({ fileId, filename, type, tag });
    };

    const first = this.studio.firstFrame();
    if (first) push(first.id, first.filename, first.kind, first.tag || 'First Frame');
    const last = this.studio.lastFrame();
    if (last) push(last.id, last.filename, last.kind, last.tag || 'Last Frame');
    for (const used of this.studio.usedAssets()) {
      const type: 'image' | 'video' | 'audio' = used.kind === 'mixed' ? 'image' : used.kind;
      push(used.fileId, used.filename, type, used.name);
    }
    return out;
  }

  /** Snapshot of the editor inputs at submit time. */
  private buildSourceSnapshot(compiled: string): GeneratedClip['source'] {
    return {
      rawDescription: compiled,
      cinematography: this.studio.cinematography(),
      output: this.studio.output(),
      assets: {
        firstFrame: this.studio.firstFrame(),
        lastFrame: this.studio.lastFrame(),
        free: this.studio.freeAssets(),
      },
    };
  }
}
