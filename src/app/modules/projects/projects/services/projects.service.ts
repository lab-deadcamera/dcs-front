import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  Chapter,
  ChapterWithScenes,
  Project,
  ProjectWithChapters,
  Scene,
  SceneWithShots,
  Shot,
  ShotWithTakes,
  Take,
} from '../interfaces';
import { ProjectsApiService } from './projects-api.service';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = inject(ProjectsApiService);

  private readonly _projects = signal<ProjectWithChapters[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingChapters = signal<Record<string, boolean>>({});
  private readonly _loadingScenes = signal<Record<string, boolean>>({});
  private readonly _loadingShots = signal<Record<string, boolean>>({});
  private readonly _loadingTakes = signal<Record<string, boolean>>({});

  readonly projects = this._projects.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingChapters = this._loadingChapters.asReadonly();
  readonly loadingScenes = this._loadingScenes.asReadonly();
  readonly loadingShots = this._loadingShots.asReadonly();
  readonly loadingTakes = this._loadingTakes.asReadonly();
  readonly count = computed(() => this._projects().length);

  load(): Observable<{ error: boolean; msg: string; data?: Project[] }> {
    this._loading.set(true);
    return this.api.listProjects().pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.set(
            res.data.map((p) => ({ project: p, chapters: [] })),
          );
        }
        this._loading.set(false);
      }),
    );
  }

  /** Lazy-load chapters for a project when the user expands it. */
  loadProjectChapters(projectId: string): void {
    if (!projectId || this._loadingChapters()[projectId]) return;

    this._loadingChapters.update((m) => ({ ...m, [projectId]: true }));
    this.api.listChapters(projectId).subscribe((res) => {
      this._loadingChapters.update((m) => ({ ...m, [projectId]: false }));
      if (!res.error && res.data) {
        this._projects.update((list) =>
          list.map((p) =>
            p.project.id === projectId
              ? { ...p, chapters: res.data!.map((c) => ({ chapter: c, scenes: [] })) }
              : p,
          ),
        );
      }
    });
  }

  /** Lazy-load scenes for a chapter when the user expands it. */
  loadChapterScenes(projectId: string, chapterId: string): void {
    if (!chapterId || this._loadingScenes()[chapterId]) return;

    this._loadingScenes.update((m) => ({ ...m, [chapterId]: true }));
    this.api.listScenes(projectId, chapterId).subscribe((res) => {
      this._loadingScenes.update((m) => ({ ...m, [chapterId]: false }));
      if (!res.error && res.data) {
        this._projects.update((list) =>
          list.map((p) =>
            p.project.id === projectId
              ? {
                  ...p,
                  chapters: p.chapters.map((c) =>
                    c.chapter.id === chapterId
                      ? { ...c, scenes: res.data!.map((s) => ({ scene: s, shots: [] })) }
                      : c,
                  ),
                }
              : p,
          ),
        );
      }
    });
  }

  /** Lazy-load shots for a scene when the user expands it. */
  loadSceneShots(projectId: string, chapterId: string, sceneId: string): void {
    if (!sceneId || this._loadingShots()[sceneId]) return;

    this._loadingShots.update((m) => ({ ...m, [sceneId]: true }));
    this.api.listShots(projectId, chapterId, sceneId).subscribe((res) => {
      this._loadingShots.update((m) => ({ ...m, [sceneId]: false }));
      if (!res.error && res.data) {
        this._projects.update((list) =>
          list.map((p) =>
            p.project.id === projectId
              ? {
                  ...p,
                  chapters: p.chapters.map((c) =>
                    c.chapter.id === chapterId
                      ? {
                          ...c,
                          scenes: c.scenes.map((s) =>
                            s.scene.id === sceneId
                              ? { ...s, shots: res.data!.map((sh) => ({ shot: sh, takes: [] })) }
                              : s,
                          ),
                        }
                      : c,
                  ),
                }
              : p,
          ),
        );
      }
    });
  }

  /** Lazy-load takes for a shot when the user expands it. */
  loadShotTakes(projectId: string, chapterId: string, sceneId: string, shotId: string): void {
    if (!shotId || this._loadingTakes()[shotId]) return;

    this._loadingTakes.update((m) => ({ ...m, [shotId]: true }));
    this.api.listTakes(projectId, chapterId, sceneId, shotId).subscribe((res) => {
      this._loadingTakes.update((m) => ({ ...m, [shotId]: false }));
      if (!res.error && res.data) {
        this._projects.update((list) =>
          list.map((p) =>
            p.project.id === projectId
              ? {
                  ...p,
                  chapters: p.chapters.map((c) =>
                    c.chapter.id === chapterId
                      ? {
                          ...c,
                          scenes: c.scenes.map((s) =>
                            s.scene.id === sceneId
                              ? {
                                  ...s,
                                  shots: s.shots.map((sh) =>
                                    sh.shot.id === shotId
                                      ? { ...sh, takes: res.data! }
                                      : sh,
                                  ),
                                }
                              : s,
                          ),
                        }
                      : c,
                  ),
                }
              : p,
          ),
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  createProject(payload: { name: string; description?: string }): Observable<{ error: boolean; msg: string; data?: Project }> {
    return this.api.createProject(payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) => [
            { project: res.data!, chapters: [] },
            ...list,
          ]);
        }
      }),
    );
  }

  updateProject(id: string, payload: { name?: string; description?: string; active?: boolean }): Observable<{ error: boolean; msg: string; data?: Project }> {
    return this.api.updateProject(id, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === id ? { project: res.data!, chapters: p.chapters } : p,
            ),
          );
        }
      }),
    );
  }

  deleteProject(id: string): Observable<{ error: boolean; msg: string }> {
    return this.api.deleteProject(id).pipe(
      tap((res) => {
        if (!res.error) {
          this._projects.update((list) => list.filter((p) => p.project.id !== id));
        }
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Chapters
  // ---------------------------------------------------------------------------

  createChapter(
    projectId: string,
    payload: { number: number; name: string; description?: string },
  ): Observable<{ error: boolean; msg: string; data?: Chapter }> {
    return this.api.createChapter(projectId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? { ...p, chapters: [...p.chapters, { chapter: res.data!, scenes: [] }] }
                : p,
            ),
          );
        }
      }),
    );
  }

  updateChapter(
    projectId: string,
    chapterId: string,
    payload: { number?: number; name?: string; description?: string; active?: boolean },
  ): Observable<{ error: boolean; msg: string; data?: Chapter }> {
    return this.api.updateChapter(projectId, chapterId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    chapters: p.chapters.map((c) =>
                      c.chapter.id === chapterId ? { chapter: res.data!, scenes: c.scenes } : c,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  deleteChapter(projectId: string, chapterId: string): Observable<{ error: boolean; msg: string }> {
    return this.api.deleteChapter(projectId, chapterId).pipe(
      tap((res) => {
        if (!res.error) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? { ...p, chapters: p.chapters.filter((c) => c.chapter.id !== chapterId) }
                : p,
            ),
          );
        }
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Scenes
  // ---------------------------------------------------------------------------

  createScene(
    projectId: string,
    chapterId: string,
    payload: { number: number; name: string; description?: string },
  ): Observable<{ error: boolean; msg: string; data?: Scene }> {
    return this.api.createScene(projectId, chapterId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    chapters: p.chapters.map((c) =>
                      c.chapter.id === chapterId
                        ? { ...c, scenes: [...c.scenes, { scene: res.data!, shots: [] }] }
                        : c,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  updateScene(
    projectId: string,
    chapterId: string,
    sceneId: string,
    payload: { number?: number; name?: string; description?: string; active?: boolean },
  ): Observable<{ error: boolean; msg: string; data?: Scene }> {
    return this.api.updateScene(projectId, chapterId, sceneId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    chapters: p.chapters.map((c) =>
                      c.chapter.id === chapterId
                        ? {
                            ...c,
                            scenes: c.scenes.map((s) =>
                              s.scene.id === sceneId ? { scene: res.data!, shots: s.shots } : s,
                            ),
                          }
                        : c,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  deleteScene(
    projectId: string,
    chapterId: string,
    sceneId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.api.deleteScene(projectId, chapterId, sceneId).pipe(
      tap((res) => {
        if (!res.error) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    chapters: p.chapters.map((c) =>
                      c.chapter.id === chapterId
                        ? { ...c, scenes: c.scenes.filter((s) => s.scene.id !== sceneId) }
                        : c,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Shots
  // ---------------------------------------------------------------------------

  createShot(
    projectId: string,
    chapterId: string,
    sceneId: string,
    payload: { number: number; name: string; description?: string },
  ): Observable<{ error: boolean; msg: string; data?: Shot }> {
    return this.api.createShot(projectId, chapterId, sceneId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    chapters: p.chapters.map((c) =>
                      c.chapter.id === chapterId
                        ? {
                            ...c,
                            scenes: c.scenes.map((s) =>
                              s.scene.id === sceneId
                                ? { ...s, shots: [...s.shots, { shot: res.data!, takes: [] }] }
                                : s,
                            ),
                          }
                        : c,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  updateShot(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    payload: { number?: number; name?: string; description?: string; active?: boolean },
  ): Observable<{ error: boolean; msg: string; data?: Shot }> {
    return this.api.updateShot(projectId, chapterId, sceneId, shotId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    chapters: p.chapters.map((c) =>
                      c.chapter.id === chapterId
                        ? {
                            ...c,
                            scenes: c.scenes.map((s) =>
                              s.scene.id === sceneId
                                ? {
                                    ...s,
                                    shots: s.shots.map((sh) =>
                                      sh.shot.id === shotId ? { shot: res.data!, takes: sh.takes } : sh,
                                    ),
                                  }
                                : s,
                            ),
                          }
                        : c,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  deleteShot(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.api.deleteShot(projectId, chapterId, sceneId, shotId).pipe(
      tap((res) => {
        if (!res.error) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    chapters: p.chapters.map((c) =>
                      c.chapter.id === chapterId
                        ? {
                            ...c,
                            scenes: c.scenes.map((s) =>
                              s.scene.id === sceneId
                                ? { ...s, shots: s.shots.filter((sh) => sh.shot.id !== shotId) }
                                : s,
                            ),
                          }
                        : c,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Takes
  // ---------------------------------------------------------------------------

  createTake(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    payload: { number: number },
  ): Observable<{ error: boolean; msg: string; data?: Take }> {
    return this.api.createTake(projectId, chapterId, sceneId, shotId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    chapters: p.chapters.map((c) =>
                      c.chapter.id === chapterId
                        ? {
                            ...c,
                            scenes: c.scenes.map((s) =>
                              s.scene.id === sceneId
                                ? {
                                    ...s,
                                    shots: s.shots.map((sh) =>
                                      sh.shot.id === shotId
                                        ? { ...sh, takes: [...sh.takes, res.data!] }
                                        : sh,
                                    ),
                                  }
                                : s,
                            ),
                          }
                        : c,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  deleteTake(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    takeId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.api.deleteTake(projectId, chapterId, sceneId, shotId, takeId).pipe(
      tap((res) => {
        if (!res.error) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    chapters: p.chapters.map((c) =>
                      c.chapter.id === chapterId
                        ? {
                            ...c,
                            scenes: c.scenes.map((s) =>
                              s.scene.id === sceneId
                                ? {
                                    ...s,
                                    shots: s.shots.map((sh) =>
                                      sh.shot.id === shotId
                                        ? { ...sh, takes: sh.takes.filter((t) => t.id !== takeId) }
                                        : sh,
                                    ),
                                  }
                                : s,
                            ),
                          }
                        : c,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }
}
