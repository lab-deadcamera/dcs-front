import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '@environment/environment';
import { catchError, of } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { RESOLVE_URL } from '@app/shared/utils';
import { ProjectsApiService } from '@modules/projects/projects/services';
import { Take } from '@modules/projects/projects/interfaces';

/**
 * Takes Review — director-side panel that lets the user drill down through
 * Project → Chapter → Scene → Shot to inspect every Take generated for a
 * given shot. Mirrors the cascade flow used by the session-gate-dialog
 * (so the user picks the same hierarchy in both screens) and reuses
 * `ProjectsApiService` for every list / take action. Local actions like
 * "save server video to local disk" hit a download endpoint that is not
 * exposed by the API service, so they keep using HttpClient directly with
 * the new chapter+shot path.
 */
interface PickerOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-takes-review',
  templateUrl: './takes-review.html',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TakesReviewComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(MessageService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly apiUrl = environment.API_URL;

  /** Returns the full URL for a local video path (/outputs/...). */
  protected videoUrl(path: string | undefined): string {
    return RESOLVE_URL(path);
  }

  // ── Cascade pickers (Project → Chapter → Scene → Shot) ───────────────

  protected readonly projects = signal<PickerOption[]>([]);
  protected readonly chapters = signal<PickerOption[]>([]);
  protected readonly scenes = signal<PickerOption[]>([]);
  protected readonly shots = signal<PickerOption[]>([]);

  protected readonly selectedProjectId = signal<string>('');
  protected readonly selectedChapterId = signal<string>('');
  protected readonly selectedSceneId = signal<string>('');
  protected readonly selectedShotId = signal<string>('');

  protected readonly loadingChapters = signal(false);
  protected readonly loadingScenes = signal(false);
  protected readonly loadingShots = signal(false);

  // ── Takes (list + per-row action state) ──────────────────────────────

  protected readonly takes = signal<Take[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingId = signal<string | null>(null);
  protected readonly savingId = signal<string | null>(null);
  protected readonly previewVisible = signal(false);
  protected readonly previewTake = signal<Take | null>(null);
  protected readonly downloadingId = signal<string | null>(null);

  ngOnInit(): void {
    this.projectsApi.listProjects().subscribe((res) => {
      if (!res.error && res.data) {
        this.projects.set(res.data.map((p) => ({ id: p.id, label: p.name })));
      }
    });
  }

  // ── Cascade handlers ─────────────────────────────────────────────────

  protected onProjectChange(id: string | null): void {
    this.selectedProjectId.set(id ?? '');
    this.selectedChapterId.set('');
    this.selectedSceneId.set('');
    this.selectedShotId.set('');
    this.chapters.set([]);
    this.scenes.set([]);
    this.shots.set([]);
    this.takes.set([]);
    if (!id) return;
    this.loadingChapters.set(true);
    this.projectsApi.listChapters(id).subscribe((res) => {
      this.loadingChapters.set(false);
      if (!res.error && res.data) {
        this.chapters.set(
          res.data.map((c) => ({
            id: c.id,
            label: `CH${String(c.number).padStart(2, '0')} — ${c.name}`,
          })),
        );
      }
    });
  }

  protected onChapterChange(id: string | null): void {
    this.selectedChapterId.set(id ?? '');
    this.selectedSceneId.set('');
    this.selectedShotId.set('');
    this.scenes.set([]);
    this.shots.set([]);
    this.takes.set([]);
    const projectId = this.selectedProjectId();
    if (!id || !projectId) return;
    this.loadingScenes.set(true);
    this.projectsApi.listScenes(projectId, id).subscribe((res) => {
      this.loadingScenes.set(false);
      if (!res.error && res.data) {
        this.scenes.set(
          res.data.map((s) => ({
            id: s.id,
            label: `SC${String(s.number).padStart(2, '0')} — ${s.name}`,
          })),
        );
      }
    });
  }

  protected onSceneChange(id: string | null): void {
    this.selectedSceneId.set(id ?? '');
    this.selectedShotId.set('');
    this.shots.set([]);
    this.takes.set([]);
    const projectId = this.selectedProjectId();
    const chapterId = this.selectedChapterId();
    if (!id || !projectId || !chapterId) return;
    this.loadingShots.set(true);
    this.projectsApi.listShots(projectId, chapterId, id).subscribe((res) => {
      this.loadingShots.set(false);
      if (!res.error && res.data) {
        this.shots.set(
          res.data.map((sh) => ({
            id: sh.id,
            label: `S${String(sh.number).padStart(2, '0')} — ${sh.name}`,
          })),
        );
      }
    });
  }

  protected onShotChange(id: string | null): void {
    this.selectedShotId.set(id ?? '');
    this.takes.set([]);
    if (!id) return;
    this.loadTakes();
  }

  // ── Takes loading & actions ──────────────────────────────────────────

  protected loadTakes(): void {
    const projectId = this.selectedProjectId();
    const chapterId = this.selectedChapterId();
    const sceneId = this.selectedSceneId();
    const shotId = this.selectedShotId();
    if (!projectId || !chapterId || !sceneId || !shotId) return;
    this.loading.set(true);
    this.projectsApi.listTakes(projectId, chapterId, sceneId, shotId).subscribe((res) => {
      this.loading.set(false);
      if (!res.error && res.data) {
        this.takes.set([...res.data].sort((a, b) => b.number - a.number));
      } else {
        this.takes.set([]);
      }
    });
  }

  protected saveLocal(take: Take): void {
    const projectId = this.selectedProjectId();
    const chapterId = this.selectedChapterId();
    const sceneId = this.selectedSceneId();
    const shotId = this.selectedShotId();
    if (!projectId || !chapterId || !sceneId || !shotId) return;
    this.savingId.set(take.id);
    this.http
      .post(
        `${this.apiUrl}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}/takes/${take.id}/download`,
        {},
      )
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (res: any) => {
          this.savingId.set(null);
          if (res && res.data) {
            this.toast.add({ severity: 'success', summary: 'Video saved locally', life: 2000 });
            this.loadTakes();
          } else {
            this.toast.add({ severity: 'error', summary: 'Failed to save video', life: 3000 });
          }
        },
        error: () => {
          this.savingId.set(null);
          this.toast.add({ severity: 'error', summary: 'Failed to save video', life: 3000 });
        },
      });
  }

  protected openPreview(take: Take): void {
    this.previewTake.set(take);
    this.previewVisible.set(true);
  }

  protected closePreview(): void {
    this.previewVisible.set(false);
    this.previewTake.set(null);
  }

  protected downloadVideo(take: Take): void {
    const url = this.videoUrl(take.video_local_url);
    if (!url) return;
    this.downloadingId.set(take.id);
    this.http
      .get(url, { responseType: 'blob' })
      .pipe(catchError(() => of(null)))
      .subscribe((blob) => {
        this.downloadingId.set(null);
        if (!blob) {
          this.toast.add({ severity: 'error', summary: 'Failed to download', life: 3000 });
          return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = url.split('/').pop() || 'video.mp4';
        a.click();
        URL.revokeObjectURL(a.href);
        this.toast.add({ severity: 'success', summary: 'Download started', life: 2000 });
      });
  }

  protected setFinal(take: Take): void {
    const projectId = this.selectedProjectId();
    const chapterId = this.selectedChapterId();
    const sceneId = this.selectedSceneId();
    const shotId = this.selectedShotId();
    if (!projectId || !chapterId || !sceneId || !shotId) return;
    this.loadingId.set(take.id);
    this.projectsApi
      .updateTake(projectId, chapterId, sceneId, shotId, take.id, { final: true })
      .subscribe({
        next: (res) => {
          this.loadingId.set(null);
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Failed to update', life: 3000 });
            return;
          }
          this.toast.add({ severity: 'success', summary: 'Take selected as final', life: 2000 });
          this.loadTakes();
        },
        error: () => {
          this.loadingId.set(null);
          this.toast.add({ severity: 'error', summary: 'Failed to update', life: 3000 });
        },
      });
  }
}
