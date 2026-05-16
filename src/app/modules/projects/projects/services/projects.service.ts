import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  Project,
  ProjectWithScenes,
  Scene,
  SceneWithTakes,
  Take,
} from '../interfaces';
import { ProjectsApiService } from './projects-api.service';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = inject(ProjectsApiService);

  private readonly _projects = signal<ProjectWithScenes[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingScenes = signal<Record<string, boolean>>({});
  private readonly _loadingTakes = signal<Record<string, boolean>>({});

  readonly projects = this._projects.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingScenes = this._loadingScenes.asReadonly();
  readonly loadingTakes = this._loadingTakes.asReadonly();
  readonly count = computed(() => this._projects().length);

  load(): Observable<{ error: boolean; msg: string; data?: Project[] }> {
    this._loading.set(true);
    return this.api.listProjects().pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.set(
            res.data.map((p) => ({ project: p, scenes: [] })),
          );
        }
        this._loading.set(false);
      }),
    );
  }

  /** Lazy-load scenes for a project when the user expands it. */
  loadProjectScenes(projectId: string): void {
    if (this._loadingScenes()[projectId]) return;

    this._loadingScenes.update((m) => ({ ...m, [projectId]: true }));
    this.api.listScenes(projectId).subscribe((res) => {
      this._loadingScenes.update((m) => ({ ...m, [projectId]: false }));
      if (!res.error && res.data) {
        this._projects.update((list) =>
          list.map((p) =>
            p.project.id === projectId
              ? { ...p, scenes: res.data!.map((s) => ({ scene: s, takes: [] })) }
              : p,
          ),
        );
      }
    });
  }

  /** Lazy-load takes for a scene when the user expands it. */
  loadSceneTakes(projectId: string, sceneId: string): void {
    if (this._loadingTakes()[sceneId]) return;

    this._loadingTakes.update((m) => ({ ...m, [sceneId]: true }));
    this.api.listTakes(projectId, sceneId).subscribe((res) => {
      this._loadingTakes.update((m) => ({ ...m, [sceneId]: false }));
      if (!res.error && res.data) {
        this._projects.update((list) =>
          list.map((p) =>
            p.project.id === projectId
              ? {
                  ...p,
                  scenes: p.scenes.map((s) =>
                    s.scene.id === sceneId
                      ? { ...s, takes: res.data! }
                      : s,
                  ),
                }
              : p,
          ),
        );
      }
    });
  }

  getScenesForProject(projectId: string): SceneWithTakes[] {
    const p = this._projects().find((p) => p.project.id === projectId);
    return p?.scenes ?? [];
  }

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  createProject(payload: { name: string; description?: string }): Observable<{ error: boolean; msg: string; data?: Project }> {
    return this.api.createProject(payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) => [
            { project: res.data!, scenes: [] },
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
              p.project.id === id ? { project: res.data!, scenes: p.scenes } : p,
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
  // Scenes
  // ---------------------------------------------------------------------------

  createScene(projectId: string, payload: { number: number; name: string; description?: string }): Observable<{ error: boolean; msg: string; data?: Scene }> {
    return this.api.createScene(projectId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? { ...p, scenes: [...p.scenes, { scene: res.data!, takes: [] }] }
                : p,
            ),
          );
        }
      }),
    );
  }

  updateScene(projectId: string, sceneId: string, payload: { number?: number; name?: string; description?: string; active?: boolean }): Observable<{ error: boolean; msg: string; data?: Scene }> {
    return this.api.updateScene(projectId, sceneId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    scenes: p.scenes.map((s) =>
                      s.scene.id === sceneId ? { scene: res.data!, takes: s.takes } : s,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  deleteScene(projectId: string, sceneId: string): Observable<{ error: boolean; msg: string }> {
    return this.api.deleteScene(projectId, sceneId).pipe(
      tap((res) => {
        if (!res.error) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? { ...p, scenes: p.scenes.filter((s) => s.scene.id !== sceneId) }
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

  createTake(projectId: string, sceneId: string, payload: { number: number }): Observable<{ error: boolean; msg: string; data?: Take }> {
    return this.api.createTake(projectId, sceneId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    scenes: p.scenes.map((s) =>
                      s.scene.id === sceneId
                        ? { ...s, takes: [...s.takes, res.data!] }
                        : s,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  updateTake(
    projectId: string,
    sceneId: string,
    takeId: string,
    payload: { video_url?: string; video_local_url?: string; status?: 'pending' | 'processing' | 'completed' | 'failed' },
  ): Observable<{ error: boolean; msg: string; data?: Take }> {
    return this.api.updateTake(projectId, sceneId, takeId, payload).pipe(
      tap((res) => {
        if (!res.error && res.data) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    scenes: p.scenes.map((s) =>
                      s.scene.id === sceneId
                        ? {
                            ...s,
                            takes: s.takes.map((t) =>
                              t.id === takeId ? res.data! : t,
                            ),
                          }
                        : s,
                    ),
                  }
                : p,
            ),
          );
        }
      }),
    );
  }

  deleteTake(projectId: string, sceneId: string, takeId: string): Observable<{ error: boolean; msg: string }> {
    return this.api.deleteTake(projectId, sceneId, takeId).pipe(
      tap((res) => {
        if (!res.error) {
          this._projects.update((list) =>
            list.map((p) =>
              p.project.id === projectId
                ? {
                    ...p,
                    scenes: p.scenes.map((s) =>
                      s.scene.id === sceneId
                        ? { ...s, takes: s.takes.filter((t) => t.id !== takeId) }
                        : s,
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
