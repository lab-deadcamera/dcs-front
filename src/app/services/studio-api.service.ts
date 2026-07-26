import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environment/environment';
import { Shot } from '@app/modules/projects/projects/interfaces';

@Injectable({ providedIn: 'root' })
export class StudioApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_URL;

  /**
   * Load scene-level assignments (presets, characters, assets).
   */
  getSceneAssignments(projectId: string, chapterId: string, sceneId: string) {
    return this.http.get<{ data: any }>(
      `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/assignments`,
    );
  }

  /**
   * Persist output format (aspect ratio, duration) to a shot so it survives
   * page reloads and is restored when the shot is loaded again.
   */
  updateShotFormat(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    data: { aspect_ratio?: string; duration_seconds?: number },
  ) {
    return this.http.patch<{ success: boolean; data?: Shot }>(
      `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}`,
      data,
    );
  }
}
