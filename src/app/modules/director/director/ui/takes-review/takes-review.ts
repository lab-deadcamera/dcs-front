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

interface ProjectOption {
  id: string;
  name: string;
}
interface SceneOption {
  id: string;
  number: number;
  name: string;
}
interface TakeItem {
  id: string;
  number: number;
  scene_id: string;
  video_url: string;
  video_local_url: string;
  status: string;
  active: boolean;
  final: boolean;
  finalized_at: string | null;
  created_at: string;
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
  private readonly apiUrl = environment.API_URL;
  private readonly baseUrl = environment.API_URL.replace(/\/api\/v1\/?$/, '');

  /** Returns the full URL for a local video path (/outputs/...). */
  protected videoUrl(path: string | undefined): string {
    return RESOLVE_URL(path);
  }

  protected readonly projects = signal<ProjectOption[]>([]);
  protected readonly scenes = signal<Array<{ id: string; label: string }>>([]);
  protected readonly selectedProjectId = signal<string>('');
  protected readonly selectedSceneId = signal<string>('');
  protected readonly takes = signal<TakeItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingId = signal<string | null>(null);
  protected readonly savingId = signal<string | null>(null);
  protected readonly previewVisible = signal(false);
  protected readonly previewTake = signal<TakeItem | null>(null);
  protected readonly downloadingId = signal<string | null>(null);

  ngOnInit(): void {
    this.http
      .get<{ data: any[] }>(`${this.apiUrl}/projects`)
      .pipe(catchError(() => of({ data: [] })))
      .subscribe((res) => {
        this.projects.set(
          (res.data || []).map((p) => ({
            id: p.id || p.project?.id,
            name: p.name || p.project?.name || '',
          })),
        );
      });
  }

  protected onProjectChange(id: string): void {
    this.selectedProjectId.set(id);
    this.selectedSceneId.set('');
    this.scenes.set([]);
    this.takes.set([]);
    if (!id) return;
    this.http
      .get<{ data: any[] }>(`${this.apiUrl}/projects/${id}/scenes`)
      .pipe(catchError(() => of({ data: [] })))
      .subscribe((res) => {
        this.scenes.set(
          (res.data || []).map((s) => ({
            id: s.id,
            label: `SC${String(s.number).padStart(2, '0')} — ${s.name}`,
          })),
        );
      });
  }

  protected loadTakes(): void {
    const sid = this.selectedSceneId();
    if (!sid) return;
    this.loading.set(true);
    this.http
      .get<{ data: any }>(`${this.apiUrl}/projects/${this.selectedProjectId()}/scenes/${sid}`)
      .pipe(catchError(() => of({ data: { takes: [] } })))
      .subscribe((res) => {
        this.takes.set(
          (res.data?.takes || []).sort((a: TakeItem, b: TakeItem) => b.number - a.number),
        );
        this.loading.set(false);
      });
  }

  protected saveLocal(take: TakeItem): void {
    this.savingId.set(take.id);
    this.http
      .post(
        `${this.apiUrl}/projects/${this.selectedProjectId()}/scenes/${this.selectedSceneId()}/takes/${take.id}/download`,
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

  protected openPreview(take: TakeItem): void {
    this.previewTake.set(take);
    this.previewVisible.set(true);
  }

  protected closePreview(): void {
    this.previewVisible.set(false);
    this.previewTake.set(null);
  }

  protected downloadVideo(take: TakeItem): void {
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

  protected setFinal(take: TakeItem): void {
    this.loadingId.set(take.id);
    this.http
      .patch(
        `${this.apiUrl}/projects/${this.selectedProjectId()}/scenes/${this.selectedSceneId()}/takes/${take.id}`,
        { final: true },
      )
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Take selected as final', life: 2000 });
          this.loadingId.set(null);
          this.loadTakes();
        },
        error: () => {
          this.toast.add({ severity: 'error', summary: 'Failed to update', life: 3000 });
          this.loadingId.set(null);
        },
      });
  }
}
