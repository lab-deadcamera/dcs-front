import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler, toCharacter } from '@shared/utils';
import {
  Character,
  CharacterFile,
  CharacterFileRole,
  CharacterWire,
  CharacterWithFiles,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../interfaces';
import { ResponseBase } from '@app/core/interfaces';

@Injectable({ providedIn: 'root' })
export class CharactersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/characters';

  list(): Observable<{ error: boolean; msg: string; data?: CharacterWithFiles[] }> {
    return this.http.get<ResponseBase<CharacterWithFiles[]>>(this.apiUrl).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<CharacterWithFiles[]>),
    );
  }

  getById(id: string): Observable<{
    error: boolean;
    msg: string;
    data?: { character: Character; files: CharacterFile[] };
  }> {
    return this.http.get<ResponseBase<CharacterWithFiles>>(`${this.apiUrl}/${id}`).pipe(
      map((r) => ({
        error: !r.success,
        msg: r.message,
        data: {
          character: toCharacter(r.data!.character),
          files: r.data!.files ?? [],
        },
      })),
      catchError(httpErrorHandler<{ character: Character; files: CharacterFile[] }>),
    );
  }

  create(
    payload: CreateCharacterRequest,
  ): Observable<{ error: boolean; msg: string; data?: CharacterWire }> {
    const body = {
      name: payload.name,
      description: payload.description,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : JSON.stringify({}),
    };

    return this.http.post<ResponseBase<CharacterWire>>(this.apiUrl, body).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<CharacterWire>),
    );
  }

  update(
    id: string,
    payload: UpdateCharacterRequest,
  ): Observable<{ error: boolean; msg: string; data?: CharacterWire }> {
    return this.http.patch<ResponseBase<CharacterWire>>(`${this.apiUrl}/${id}`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<CharacterWire>),
    );
  }

  delete(id: string): Observable<{ error: boolean; msg: string }> {
    return this.http.delete<ResponseBase<unknown>>(`${this.apiUrl}/${id}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }

  // ---------------------------------------------------------------------------
  // Character ? File linkage
  // ---------------------------------------------------------------------------

  assignFile(
    characterId: string,
    fileId: string,
    role: CharacterFileRole = 'reference',
  ): Observable<{ error: boolean; msg: string }> {
    return this.http
      .post<ResponseBase<null>>(`${this.apiUrl}/${characterId}/files`, {
        file_id: fileId,
        role,
      })
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message })),
        catchError((err) => httpErrorHandler<void>(err)),
      );
  }

  listFiles(characterId: string): Observable<{
    error: boolean;
    msg: string;
    data?: CharacterFile[];
  }> {
    return this.http.get<ResponseBase<CharacterFile[]>>(`${this.apiUrl}/${characterId}/files`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<CharacterFile[]>),
    );
  }

  unassignFile(characterId: string, fileId: string): Observable<{ error: boolean; msg: string }> {
    return this.http
      .delete<ResponseBase<unknown>>(`${this.apiUrl}/${characterId}/files/${fileId}`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message })),
        catchError((err) => httpErrorHandler<void>(err)),
      );
  }
}
