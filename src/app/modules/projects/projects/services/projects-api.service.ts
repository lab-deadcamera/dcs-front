import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import { ResponseBase } from '@app/core/interfaces';
import {
  CreateProjectRequest,
  CreateSceneRequest,
  CreateTakeRequest,
  Project,
  Scene,
  Take,
  UpdateProjectRequest,
  UpdateSceneRequest,
  UpdateTakeRequest,
} from '../interfaces';

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

  createProject(payload: CreateProjectRequest): Observable<{ error: boolean; msg: string; data?: Project }> {
    return this.http.post<ResponseBase<Project>>(`${this.apiUrl}/projects`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Project>),
    );
  }

  updateProject(id: string, payload: UpdateProjectRequest): Observable<{ error: boolean; msg: string; data?: Project }> {
    return this.http.patch<ResponseBase<Project>>(`${this.apiUrl}/projects/${id}`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Project>),
    );
  }

  deleteProject(id: string): Observable<{ error: boolean; msg: string }> {
    return this.http.delete<ResponseBase<unknown>>(`${this.apiUrl}/projects/${id}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }

  // ---------------------------------------------------------------------------
  // Scenes
  // ---------------------------------------------------------------------------

  listScenes(projectId: string): Observable<{ error: boolean; msg: string; data?: Scene[] }> {
    return this.http.get<ResponseBase<Scene[]>>(`${this.apiUrl}/projects/${projectId}/scenes`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Scene[]>),
    );
  }

  createScene(projectId: string, payload: CreateSceneRequest): Observable<{ error: boolean; msg: string; data?: Scene }> {
    return this.http.post<ResponseBase<Scene>>(`${this.apiUrl}/projects/${projectId}/scenes`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Scene>),
    );
  }

  updateScene(projectId: string, sceneId: string, payload: UpdateSceneRequest): Observable<{ error: boolean; msg: string; data?: Scene }> {
    return this.http.patch<ResponseBase<Scene>>(`${this.apiUrl}/projects/${projectId}/scenes/${sceneId}`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Scene>),
    );
  }

  deleteScene(projectId: string, sceneId: string): Observable<{ error: boolean; msg: string }> {
    return this.http.delete<ResponseBase<unknown>>(`${this.apiUrl}/projects/${projectId}/scenes/${sceneId}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }

  // ---------------------------------------------------------------------------
  // Takes
  // ---------------------------------------------------------------------------

  listTakes(projectId: string, sceneId: string): Observable<{ error: boolean; msg: string; data?: Take[] }> {
    return this.http.get<ResponseBase<Take[]>>(`${this.apiUrl}/projects/${projectId}/scenes/${sceneId}/takes`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Take[]>),
    );
  }

  getTake(projectId: string, sceneId: string, takeId: string): Observable<{ error: boolean; msg: string; data?: Take }> {
    return this.http.get<ResponseBase<Take>>(`${this.apiUrl}/projects/${projectId}/scenes/${sceneId}/takes/${takeId}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Take>),
    );
  }

  createTake(projectId: string, sceneId: string, payload: CreateTakeRequest): Observable<{ error: boolean; msg: string; data?: Take }> {
    return this.http.post<ResponseBase<Take>>(`${this.apiUrl}/projects/${projectId}/scenes/${sceneId}/takes`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Take>),
    );
  }

  updateTake(projectId: string, sceneId: string, takeId: string, payload: UpdateTakeRequest): Observable<{ error: boolean; msg: string; data?: Take }> {
    return this.http.patch<ResponseBase<Take>>(`${this.apiUrl}/projects/${projectId}/scenes/${sceneId}/takes/${takeId}`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Take>),
    );
  }

  deleteTake(projectId: string, sceneId: string, takeId: string): Observable<{ error: boolean; msg: string }> {
    return this.http.delete<ResponseBase<unknown>>(`${this.apiUrl}/projects/${projectId}/scenes/${sceneId}/takes/${takeId}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }
}
