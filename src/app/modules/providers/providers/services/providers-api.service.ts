import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import { ResponseBase } from '@app/core/interfaces';
import {
  CreateModelRequest,
  CreateProviderRequest,
  Model,
  ModelWithProvider,
  Provider,
  ProviderWithModels,
  UpdateModelRequest,
  UpdateProviderRequest,
} from '../interfaces';

@Injectable({ providedIn: 'root' })
export class ProvidersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;

  // ---------------------------------------------------------------------------
  // Providers
  // ---------------------------------------------------------------------------

  listProviders(): Observable<{ error: boolean; msg: string; data?: ProviderWithModels[] }> {
    return this.http.get<ResponseBase<ProviderWithModels[]>>(`${this.apiUrl}/providers`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<ProviderWithModels[]>),
    );
  }

  getProvider(
    id: string,
  ): Observable<{ error: boolean; msg: string; data?: ProviderWithModels }> {
    return this.http.get<ResponseBase<ProviderWithModels>>(`${this.apiUrl}/providers/${id}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<ProviderWithModels>),
    );
  }

  createProvider(
    payload: CreateProviderRequest,
  ): Observable<{ error: boolean; msg: string; data?: Provider }> {
    return this.http.post<ResponseBase<Provider>>(`${this.apiUrl}/providers`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Provider>),
    );
  }

  updateProvider(
    id: string,
    payload: UpdateProviderRequest,
  ): Observable<{ error: boolean; msg: string; data?: Provider }> {
    return this.http.patch<ResponseBase<Provider>>(`${this.apiUrl}/providers/${id}`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Provider>),
    );
  }

  deleteProvider(id: string): Observable<{ error: boolean; msg: string }> {
    return this.http.delete<ResponseBase<unknown>>(`${this.apiUrl}/providers/${id}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }

  listProviderModels(
    providerId: string,
  ): Observable<{ error: boolean; msg: string; data?: Model[] }> {
    return this.http
      .get<ResponseBase<Model[]>>(`${this.apiUrl}/providers/${providerId}/models`)
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError(httpErrorHandler<Model[]>),
      );
  }

  // ---------------------------------------------------------------------------
  // Models
  // ---------------------------------------------------------------------------

  listModels(): Observable<{ error: boolean; msg: string; data?: ModelWithProvider[] }> {
    return this.http.get<ResponseBase<ModelWithProvider[]>>(`${this.apiUrl}/models`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<ModelWithProvider[]>),
    );
  }

  getModel(id: string): Observable<{ error: boolean; msg: string; data?: Model }> {
    return this.http.get<ResponseBase<Model>>(`${this.apiUrl}/models/${id}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Model>),
    );
  }

  createModel(
    payload: CreateModelRequest,
  ): Observable<{ error: boolean; msg: string; data?: Model }> {
    return this.http.post<ResponseBase<Model>>(`${this.apiUrl}/models`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Model>),
    );
  }

  updateModel(
    id: string,
    payload: UpdateModelRequest,
  ): Observable<{ error: boolean; msg: string; data?: Model }> {
    return this.http.patch<ResponseBase<Model>>(`${this.apiUrl}/models/${id}`, payload).pipe(
      map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
      catchError(httpErrorHandler<Model>),
    );
  }

  deleteModel(id: string): Observable<{ error: boolean; msg: string }> {
    return this.http.delete<ResponseBase<unknown>>(`${this.apiUrl}/models/${id}`).pipe(
      map((r) => ({ error: !r.success, msg: r.message })),
      catchError((err) => httpErrorHandler<void>(err)),
    );
  }
}
