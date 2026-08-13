import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';

export interface Skill {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillRequest {
  name: string;
  description?: string;
  system_prompt: string;
}

export interface UpdateSkillRequest {
  name?: string;
  description?: string;
  system_prompt?: string;
}

@Injectable({ providedIn: 'root' })
export class SkillService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;

  list(): Observable<{ error: boolean; msg: string; data?: Skill[] }> {
    const res = { error: true, msg: 'Error undefined', data: undefined as Skill[] | undefined };

    return this.http.get<{ success: boolean; data?: Skill[]; message?: string }>(
      `${this.apiUrl}/skills`,
    ).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message || '';
        res.data = r.data;
        return res;
      }),
      catchError(httpErrorHandler<Skill[]>),
    );
  }

  getById(id: string): Observable<{ error: boolean; msg: string; data?: Skill }> {
    const res = { error: true, msg: 'Error undefined', data: undefined as Skill | undefined };

    return this.http.get<{ success: boolean; data?: Skill; message?: string }>(
      `${this.apiUrl}/skills/${id}`,
    ).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message || '';
        res.data = r.data;
        return res;
      }),
      catchError(httpErrorHandler<Skill>),
    );
  }

  create(req: CreateSkillRequest): Observable<{ error: boolean; msg: string; data?: Skill }> {
    const res = { error: true, msg: 'Error undefined', data: undefined as Skill | undefined };

    return this.http.post<{ success: boolean; data?: Skill; message?: string }>(
      `${this.apiUrl}/skills`, req,
    ).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message || '';
        res.data = r.data;
        return res;
      }),
      catchError(httpErrorHandler<Skill>),
    );
  }

  update(id: string, req: UpdateSkillRequest): Observable<{ error: boolean; msg: string; data?: Skill }> {
    const res = { error: true, msg: 'Error undefined', data: undefined as Skill | undefined };

    return this.http.patch<{ success: boolean; data?: Skill; message?: string }>(
      `${this.apiUrl}/skills/${id}`, req,
    ).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message || '';
        res.data = r.data;
        return res;
      }),
      catchError(httpErrorHandler<Skill>),
    );
  }

  delete(id: string): Observable<{ error: boolean; msg: string }> {
    const res = { error: true, msg: 'Error undefined' };

    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.apiUrl}/skills/${id}`,
    ).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message || '';
        return res;
      }),
      catchError(httpErrorHandler),
    );
  }
}
