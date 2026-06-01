import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environment/environment';
import { Preset, PresetGroup } from '@core/interfaces';

@Injectable({ providedIn: 'root' })
export class PresetApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL + '/presets';

  getGroups(includeInactive = false): Observable<PresetGroup[]> {
    return this.http
      .get<{ data: PresetGroup[] }>(`${this.apiUrl}/groups${includeInactive ? '?include_inactive=true' : ''}`)
      .pipe(map((r) => r.data));
  }

  createGroup(data: { name: string; slug: string; description?: string }): Observable<PresetGroup> {
    return this.http.post<{ data: PresetGroup }>(`${this.apiUrl}/groups`, data).pipe(map((r) => r.data));
  }

  updateGroup(id: string, data: { name?: string; description?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/groups/${id}`, data);
  }

  getPresets(groupId?: string, includeInactive = false): Observable<Preset[]> {
    let params = '';
    if (groupId) params += `group_id=${groupId}&`;
    if (includeInactive) params += 'include_inactive=true';
    return this.http
      .get<{ data: Preset[] }>(`${this.apiUrl}${params ? '?' + params : ''}`)
      .pipe(map((r) => r.data));
  }

  createPreset(data: { group_id: string; code: string; label: string; prompt: string }): Observable<Preset> {
    return this.http.post<{ data: Preset }>(`${this.apiUrl}`, data).pipe(map((r) => r.data));
  }

  updatePreset(id: string, data: { label?: string; prompt?: string; active?: boolean }): Observable<Preset> {
    return this.http.patch<{ data: Preset }>(`${this.apiUrl}/${id}`, data).pipe(map((r) => r.data));
  }

  deletePreset(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
