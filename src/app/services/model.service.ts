import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ModelData, ResponseBase } from '@app/core/interfaces';
import { httpErrorHandler } from '@app/shared/utils';
import { environment } from '@environment/environment';
import { catchError, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ModelService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = environment.API_URL;

  getById(id: string): Observable<{ error: boolean; msg: string; data?: ModelData }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as ModelData | undefined,
    };

    return this.http.get<ResponseBase<ModelData>>(`${this.apiUrl}/models/${id}`).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message;
        res.data = r.data;
        return res;
      }),
      catchError(httpErrorHandler<ModelData>),
    );
  }

  public getAllModelsByProvider(
    providerId: string,
  ): Observable<{ error: boolean; msg: string; data?: ModelData[] }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as ModelData[] | undefined,
    };

    return this.http
      .get<ResponseBase<ModelData[]>>(`${this.apiUrl}/providers/${providerId}/models`)
      .pipe(
        map((r) => {
          res.error = !r.success;
          res.msg = r.message;
          res.data = r.data;
          return res;
        }),
        catchError(httpErrorHandler<ModelData[]>),
      );
  }

  public getAllModels(): Observable<{ error: boolean; msg: string; data?: ModelData[] }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as ModelData[] | undefined,
    };

    return this.http.get<ResponseBase<ModelData[]>>(`${this.apiUrl}/models`).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message;
        res.data = r.data;
        return res;
      }),
      catchError(httpErrorHandler<ModelData[]>),
    );
  }

  public setFavorite(id: string): Observable<{ error: boolean; msg: string; data?: ModelData }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as ModelData | undefined,
    };

    return this.http.post<ResponseBase<ModelData>>(`${this.apiUrl}/models/${id}/favorite`, {}).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message;
        res.data = r.data;
        return res;
      }),
      catchError(httpErrorHandler<ModelData>),
    );
  }

  public getFavorite(): Observable<{ error: boolean; msg: string; data?: ModelData }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as ModelData | undefined,
    };

    return this.http.get<ResponseBase<ModelData>>(`${this.apiUrl}/models/favorite`).pipe(
      map((r) => {
        res.error = !r.success;
        res.msg = r.message;
        res.data = r.data;
        return res;
      }),
      catchError(httpErrorHandler<ModelData>),
    );
  }
}
