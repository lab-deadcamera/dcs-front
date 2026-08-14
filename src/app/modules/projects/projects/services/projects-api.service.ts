import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import { ResponseBase } from '@app/core/interfaces';
import {
  Chapter,
  ChapterWithScenes,
  CreateChapterRequest,
  CreateProjectRequest,
  CreateSceneRequest,
  CreateShotRequest,
  CreateTakeRequest,
  Project,
  ProjectWithChapters,
  Scene,
  Shot,
  Take,
  UpdateChapterRequest,
  UpdateProjectRequest,
  UpdateSceneRequest,
  UpdateShotRequest,
  UpdateTakeRequest,
} from '../interfaces';

/** Minimal shape returned by the save-generation endpoint. */
export interface SaveGenerationResponse {
  id: string;
  shot_id: string;
  number: number;
  video_url: string;
  status: string;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  listProjects(): Observable<{ error: boolean; msg: string; data?: Project[] }> {
    return this.http.get<ResponseBase<Project[]>>(`${this.apiUrl}/projects`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Project[]>),
    );
  }

  createProject(
    payload: CreateProjectRequest,
  ): Observable<{ error: boolean; msg: string; data?: Project }> {
    return this.http.post<ResponseBase<Project>>(`${this.apiUrl}/projects`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Project>),
    );
  }

  updateProject(
    id: string,
    payload: UpdateProjectRequest,
  ): Observable<{ error: boolean; msg: string; data?: Project }> {
    return this.http.patch<ResponseBase<Project>>(`${this.apiUrl}/projects/${id}`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Project>),
    );
  }

  /** Get a single project with its full chapter/scene/shot hierarchy. */
  getProjectHierarchy(
    id: string,
  ): Observable<{ error: boolean; msg: string; data?: ProjectWithChapters }> {
    return this.http.get<ResponseBase<ProjectWithChapters>>(`${this.apiUrl}/projects/${id}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<ProjectWithChapters>),
    );
  }

  /** Admin endpoint: lists all projects including inactive ones. */
  listProjectsAdmin(): Observable<{ error: boolean; msg: string; data?: Project[] }> {
    return this.http.get<ResponseBase<Project[]>>(`${this.apiUrl}/projects/list-all`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Project[]>),
    );
  }

  deleteProject(id: string): Observable<{ error: boolean; msg: string }> {
    return this.http.delete<ResponseBase<unknown>>(`${this.apiUrl}/projects/${id}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }

  // ---------------------------------------------------------------------------
  // Chapters
  // ---------------------------------------------------------------------------

  listChapters(projectId: string): Observable<{ error: boolean; msg: string; data?: Chapter[] }> {
    return this.http
      .get<ResponseBase<Chapter[]>>(`${this.apiUrl}/projects/${projectId}/chapters`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Chapter[]>),
      );
  }

  createChapter(
    projectId: string,
    payload: CreateChapterRequest,
  ): Observable<{ error: boolean; msg: string; data?: Chapter }> {
    return this.http
      .post<ResponseBase<Chapter>>(`${this.apiUrl}/projects/${projectId}/chapters`, payload)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Chapter>),
      );
  }

  updateChapter(
    projectId: string,
    chapterId: string,
    payload: UpdateChapterRequest,
  ): Observable<{ error: boolean; msg: string; data?: Chapter }> {
    return this.http
      .patch<
        ResponseBase<Chapter>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}`, payload)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Chapter>),
      );
  }

  deleteChapter(projectId: string, chapterId: string): Observable<{ error: boolean; msg: string }> {
    return this.http
      .delete<ResponseBase<unknown>>(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message })),
        catchError((err) => httpErrorHandler<void>(err)),
      );
  }

  // ---------------------------------------------------------------------------
  // Scenes
  // ---------------------------------------------------------------------------

  listScenes(
    projectId: string,
    chapterId: string,
  ): Observable<{ error: boolean; msg: string; data?: Scene[] }> {
    return this.http
      .get<
        ResponseBase<Scene[]>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Scene[]>),
      );
  }

  createScene(
    projectId: string,
    chapterId: string,
    payload: CreateSceneRequest,
  ): Observable<{ error: boolean; msg: string; data?: Scene }> {
    return this.http
      .post<
        ResponseBase<Scene>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes`, payload)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Scene>),
      );
  }

  updateScene(
    projectId: string,
    chapterId: string,
    sceneId: string,
    payload: UpdateSceneRequest,
  ): Observable<{ error: boolean; msg: string; data?: Scene }> {
    return this.http
      .patch<
        ResponseBase<Scene>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}`, payload)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Scene>),
      );
  }

  deleteScene(
    projectId: string,
    chapterId: string,
    sceneId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.http
      .delete<
        ResponseBase<unknown>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message })),
        catchError((err) => httpErrorHandler<void>(err)),
      );
  }

  // ---------------------------------------------------------------------------
  // Shots
  // ---------------------------------------------------------------------------

  listShots(
    projectId: string,
    chapterId: string,
    sceneId: string,
  ): Observable<{ error: boolean; msg: string; data?: Shot[] }> {
    return this.http
      .get<
        ResponseBase<Shot[]>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Shot[]>),
      );
  }

  createShot(
    projectId: string,
    chapterId: string,
    sceneId: string,
    payload: CreateShotRequest,
  ): Observable<{ error: boolean; msg: string; data?: Shot }> {
    return this.http
      .post<
        ResponseBase<Shot>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots`, payload)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Shot>),
      );
  }

  getShot(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
  ): Observable<{ error: boolean; msg: string; data?: { shot: Shot; takes: Take[] } }> {
    return this.http
      .get<
        ResponseBase<{ shot: Shot; takes: Take[] }>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<{ shot: Shot; takes: Take[] }>),
      );
  }

  updateShot(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    payload: UpdateShotRequest,
  ): Observable<{ error: boolean; msg: string; data?: Shot }> {
    return this.http
      .patch<
        ResponseBase<Shot>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}`, payload)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Shot>),
      );
  }

  deleteShot(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.http
      .delete<
        ResponseBase<unknown>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message })),
        catchError((err) => httpErrorHandler<void>(err)),
      );
  }

  // ---------------------------------------------------------------------------
  // Takes
  // ---------------------------------------------------------------------------

  listTakes(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
  ): Observable<{ error: boolean; msg: string; data?: Take[] }> {
    return this.http
      .get<
        Take[]
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}/takes`)
      .pipe(
        map((r: any) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Take[]>),
      );
  }

  getTake(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    takeId: string,
  ): Observable<{ error: boolean; msg: string; data?: Take }> {
    return this.http
      .get<Take>(
        `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}/takes/${takeId}`,
      )
      .pipe(
        map((r: any) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Take>),
      );
  }

  createTake(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    payload: CreateTakeRequest,
  ): Observable<{ error: boolean; msg: string; data?: Take }> {
    return this.http
      .post<Take>(
        `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}/takes`,
        payload,
      )
      .pipe(
        map((r: any) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Take>),
      );
  }

  updateTake(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    takeId: string,
    payload: UpdateTakeRequest,
  ): Observable<{ error: boolean; msg: string; data?: Take }> {
    return this.http
      .patch<Take>(
        `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}/takes/${takeId}`,
        payload,
      )
      .pipe(
        map((r: any) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Take>),
      );
  }

  deleteTake(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    takeId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.http
      .delete<
        ResponseBase<unknown>
      >(`${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}/takes/${takeId}`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message })),
        catchError((err) => httpErrorHandler<void>(err)),
      );
  }

  // ---------------------------------------------------------------------------
  // Take actions (toggle-active)
  // ---------------------------------------------------------------------------

  toggleTakeActive(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    takeId: string,
  ): Observable<{ error: boolean; msg: string; data?: SaveGenerationResponse }> {
    return this.http
      .post<SaveGenerationResponse>(
        `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}/takes/${takeId}/toggle-active`,
        {},
      )
      .pipe(
        map((r: any) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<SaveGenerationResponse>),
      );
  }

  // ---------------------------------------------------------------------------
  // Chapter Assignments
  // ---------------------------------------------------------------------------

  getChapterAssignments(
    projectId: string,
    chapterId: string,
  ): Observable<{ error: boolean; msg: string; data?: any }> {
    return this.http
      .get<ResponseBase<any>>(
        `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/assignments`,
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<any>),
      );
  }

  /** Legacy scene-level assignments — used as a fallback while episode data
   *  has not been migrated from scene to chapter yet. */
  getSceneAssignments(
    projectId: string,
    sceneId: string,
  ): Observable<{ error: boolean; msg: string; data?: any }> {
    return this.http
      .get<ResponseBase<any>>(
        `${this.apiUrl}/projects/${projectId}/scenes/${sceneId}/assignments`,
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<any>),
      );
  }

  assignCharacterToChapter(
    projectId: string,
    chapterId: string,
    characterId: string,
    slot?: string,
  ): Observable<{ error: boolean; msg: string; data?: { id: string } }> {
    return this.http
      .post<ResponseBase<{ id: string }>>(
        `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/assignments/characters`,
        { character_id: characterId, ...(slot ? { slot } : {}) },
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<{ id: string }>),
      );
  }

  assignAssetToChapter(
    projectId: string,
    chapterId: string,
    fileId: string,
    slot?: string,
  ): Observable<{ error: boolean; msg: string; data?: { id: string } }> {
    return this.http
      .post<ResponseBase<{ id: string }>>(
        `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/assignments/assets`,
        { file_id: fileId, ...(slot ? { slot } : {}) },
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<{ id: string }>),
      );
  }

  /** Unassign an asset from a chapter by its chapter_assets row id. */
  removeAssetFromChapter(
    projectId: string,
    chapterId: string,
    assignmentId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.http
      .delete<ResponseBase<void>>(
        `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/assignments/assets/${assignmentId}`,
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message })),
        catchError(httpErrorHandler<void>),
      );
  }

  /** Unassign a character from a chapter by its chapter_characters row id. */
  removeCharacterFromChapter(
    projectId: string,
    chapterId: string,
    assignmentId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.http
      .delete<ResponseBase<void>>(
        `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/assignments/characters/${assignmentId}`,
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message })),
        catchError(httpErrorHandler<void>),
      );
  }
}
