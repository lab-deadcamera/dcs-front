import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import {
  Character,
  CharacterDetailWire,
  CharacterFile,
  CharacterFileLinkView,
  CharacterFileLinkWire,
  CharacterWire,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../interfaces';

/**
 * HTTP-only adapter for /api/v1/characters.
 *
 * Translates between the wire format (metadata stringified, snake_case
 * timestamps) and the domain `Character` shape that the rest of the app
 * works with. Every public method funnels through `catchError(httpErrorHandler)`
 * so callers always receive `{ error, msg, data? }`.
 */
@Injectable({ providedIn: 'root' })
export class CharactersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/characters';

  list(): Observable<{ error: boolean; msg: string; data?: Character[] }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as Character[] | undefined,
    };

    return this.http.get<CharacterWire[]>(this.apiUrl).pipe(
      map((wire) => {
        res.error = false;
        res.msg = 'ok';
        res.data = wire.map((w) => toCharacter(w));
        return res;
      }),
      catchError(httpErrorHandler<Character[]>),
    );
  }

  getById(
    id: string,
  ): Observable<{
    error: boolean;
    msg: string;
    data?: { character: Character; files: CharacterFile[] };
  }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as
        | { character: Character; files: CharacterFile[] }
        | undefined,
    };

    return this.http
      .get<CharacterDetailWire>(`${this.apiUrl}/${id}`)
      .pipe(
        map((wire) => {
          res.error = false;
          res.msg = 'ok';
          res.data = {
            character: toCharacter(wire.character),
            files: wire.files ?? [],
          };
          return res;
        }),
        catchError(
          httpErrorHandler<{ character: Character; files: CharacterFile[] }>,
        ),
      );
  }

  create(
    payload: CreateCharacterRequest,
  ): Observable<{ error: boolean; msg: string; data?: Character }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as Character | undefined,
    };

    const body = {
      name: payload.name,
      description: payload.description,
      metadata: payload.metadata
        ? JSON.stringify(payload.metadata)
        : JSON.stringify({}),
    };

    return this.http.post<CharacterWire>(this.apiUrl, body).pipe(
      map((wire) => {
        res.error = false;
        res.msg = 'ok';
        res.data = toCharacter(wire);
        return res;
      }),
      catchError(httpErrorHandler<Character>),
    );
  }

  update(
    id: string,
    payload: UpdateCharacterRequest,
  ): Observable<{ error: boolean; msg: string; data?: Character }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as Character | undefined,
    };

    return this.http
      .patch<CharacterWire>(`${this.apiUrl}/${id}`, payload)
      .pipe(
        map((wire) => {
          res.error = false;
          res.msg = 'ok';
          res.data = toCharacter(wire);
          return res;
        }),
        catchError(httpErrorHandler<Character>),
      );
  }

  delete(id: string): Observable<{ error: boolean; msg: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`).pipe(
      map((r) => ({ error: false, msg: r?.message ?? 'ok' })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }

  // ---------------------------------------------------------------------------
  // Character ⇄ File linkage
  // ---------------------------------------------------------------------------

  /** Link an existing file to a character with the given role. */
  assignFile(
    characterId: string,
    fileId: string,
    role: string = 'reference',
  ): Observable<{ error: boolean; msg: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/${characterId}/files`, {
        file_id: fileId,
        role,
      })
      .pipe(
        map((r) => ({ error: false, msg: r?.message ?? 'ok' })),
        catchError((err) => httpErrorHandler<void>(err)),
      );
  }

  /** List the files currently linked to a character. */
  listFiles(
    characterId: string,
  ): Observable<{
    error: boolean;
    msg: string;
    data?: CharacterFileLinkView[];
  }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as CharacterFileLinkView[] | undefined,
    };

    return this.http
      .get<CharacterFileLinkWire[]>(`${this.apiUrl}/${characterId}/files`)
      .pipe(
        map((arr) => {
          res.error = false;
          res.msg = 'ok';
          res.data = arr.map((w) => ({
            fileId: w.file_id,
            role: w.role,
            createdAt: w.created_at,
          }));
          return res;
        }),
        catchError(httpErrorHandler<CharacterFileLinkView[]>),
      );
  }

  /** Remove the link between a character and a file (file itself stays). */
  unassignFile(
    characterId: string,
    fileId: string,
  ): Observable<{ error: boolean; msg: string }> {
    return this.http
      .delete<{ message: string }>(
        `${this.apiUrl}/${characterId}/files/${fileId}`,
      )
      .pipe(
        map((r) => ({ error: false, msg: r?.message ?? 'ok' })),
        catchError((err) => httpErrorHandler<void>(err)),
      );
  }
}

/** Parse metadata + camelCase timestamps. */
function toCharacter(w: CharacterWire): Character {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    metadata: parseMetadata(w.metadata),
    createdAt: w.created_at,
    updatedAt: w.updated_at,
    deletedAt: w.deleted_at,
  };
}

function parseMetadata(raw: string | null): Character['metadata'] {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
