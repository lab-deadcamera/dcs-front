import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '@environment/environment';
import { catchError, of } from 'rxjs';

interface ProjectOption { id: string; name: string }
interface SceneOption { id: string; number: number; name: string }
interface TakeItem {
  id: string; number: number; scene_id: string;
  video_url: string; video_local_url: string;
  status: string; active: boolean; final: boolean;
  finalized_at: string | null;
  created_at: string;
}

@Component({
  selector: 'app-takes-review',
  standalone: true,
  imports: [DatePipe, FormsModule, ButtonModule, SelectModule, ToastModule],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-6">
      <div class="mb-6">
        <h1 class="text-[18px] font-bold uppercase tracking-[0.12em]">Takes Review</h1>
        <p class="mt-1 text-[12px] text-fg-muted">Review generated takes by scene and select the final take</p>
      </div>

      <div class="mb-4 flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-[0.12em]">Project</label>
          <p-select
            [options]="projects()" optionLabel="name" optionValue="id"
            [ngModel]="selectedProjectId()" (ngModelChange)="onProjectChange($event)"
            placeholder="Select project" [showClear]="true" styleClass="w-56"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[10px] font-bold uppercase tracking-[0.12em]">Scene</label>
          <p-select
            [options]="scenes()" optionLabel="label" optionValue="id"
            [ngModel]="selectedSceneId()" (ngModelChange)="selectedSceneId.set($event ?? '')"
            placeholder="Select scene" [showClear]="true" styleClass="w-56"
            [disabled]="!selectedProjectId()"
          />
        </div>
        <p-button label="Load Takes" icon="pi pi-search" (onClick)="loadTakes()" [disabled]="!selectedSceneId()" />
      </div>

      @if (loading()) {
        <p class="py-8 text-center text-[13px] italic text-fg-muted">Loading...</p>
      }

      @if (!loading() && takes().length > 0) {
        <div class="overflow-x-auto rounded border border-ink-700">
          <table class="w-full text-[12px]">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                <th class="px-3 py-2 font-medium">Take</th>
                <th class="px-3 py-2 font-medium">Preview</th>
                <th class="px-3 py-2 font-medium">Status</th>
                <th class="px-3 py-2 font-medium">Active</th>
                <th class="px-3 py-2 font-medium">Final</th>
                <th class="px-3 py-2 font-medium">Date</th>
                <th class="w-40 px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (t of takes(); track t.id) {
                <tr class="border-t border-ink-700" [class.bg-green-900/10]="t.final">
                  <td class="px-3 py-2 font-mono font-bold">Take {{ t.number }}</td>
                  <td class="px-3 py-2">
                    @if (t.video_local_url || t.video_url) {
                      <video
                        [src]="t.video_local_url || t.video_url"
                        class="h-20 w-36 rounded object-cover"
                        preload="metadata" playsinline muted
                      ></video>
                    } @else {
                      <span class="text-fg-muted">No video</span>
                    }
                  </td>
                  <td class="px-3 py-2">
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      [class.bg-green-900/40]="t.status === 'succeeded'"
                      [class.text-green-400]="t.status === 'succeeded'"
                      [class.bg-yellow-900/40]="t.status === 'running'"
                      [class.text-yellow-400]="t.status === 'running'"
                      [class.bg-red-900/40]="t.status === 'failed'"
                      [class.text-red-400]="t.status === 'failed'"
                    >{{ t.status }}</span>
                  </td>
                  <td class="px-3 py-2">
                    @if (t.active) {
                      <span class="text-green-400">● Active</span>
                    } @else {
                      <span class="text-fg-muted">○</span>
                    }
                  </td>
                  <td class="px-3 py-2">
                    @if (t.final) {
                      <span class="inline-flex items-center rounded-full bg-yellow-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-400">★ Final</span>
                    }
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 font-mono text-fg-muted">{{ t.created_at | date: 'dd/MM/yy HH:mm' }}</td>
                  <td class="px-3 py-2">
                    <div class="flex gap-1">
                      @if (!t.final) {
                        <p-button
                          label="Select as Final"
                          icon="pi pi-star"
                          severity="contrast"
                          size="small"
                          [loading]="loadingId() === t.id"
                          (onClick)="setFinal(t)"
                        />
                      }
                      @if (t.video_local_url || t.video_url) {
                        <a
                          [href]="t.video_local_url || t.video_url"
                          target="_blank"
                          class="inline-flex items-center rounded bg-ink-700 px-2 py-1 text-[10px] text-primary-400 transition-colors hover:bg-ink-600"
                        >Open</a>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!loading() && takes().length === 0 && selectedSceneId()) {
        <p class="py-8 text-center text-[13px] italic text-fg-muted">No takes found for this scene.</p>
      }
    </section>
  `,
})
export class TakesReviewComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(MessageService);
  private readonly apiUrl = environment.API_URL;

  protected readonly projects = signal<ProjectOption[]>([]);
  protected readonly scenes = signal<Array<{ id: string; label: string }>>([]);
  protected readonly selectedProjectId = signal<string>('');
  protected readonly selectedSceneId = signal<string>('');
  protected readonly takes = signal<TakeItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingId = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<{ data: any[] }>(`${this.apiUrl}/projects`).pipe(
      catchError(() => of({ data: [] })),
    ).subscribe((res) => {
      this.projects.set((res.data || []).map((p) => ({ id: p.id || p.project?.id, name: p.name || p.project?.name || '' })));
    });
  }

  protected onProjectChange(id: string): void {
    this.selectedProjectId.set(id);
    this.selectedSceneId.set('');
    this.scenes.set([]);
    this.takes.set([]);
    if (!id) return;
    this.http.get<{ data: any[] }>(`${this.apiUrl}/projects/${id}/scenes`).pipe(
      catchError(() => of({ data: [] })),
    ).subscribe((res) => {
      this.scenes.set((res.data || []).map((s) => ({
        id: s.id,
        label: `SC${String(s.number).padStart(2, '0')} — ${s.name}`,
      })));
    });
  }

  protected loadTakes(): void {
    const sid = this.selectedSceneId();
    if (!sid) return;
    this.loading.set(true);
    this.http.get<{ data: any }>(`${this.apiUrl}/projects/${this.selectedProjectId()}/scenes/${sid}`).pipe(
      catchError(() => of({ data: { takes: [] } })),
    ).subscribe((res) => {
      this.takes.set((res.data?.takes || []).sort((a: TakeItem, b: TakeItem) => b.number - a.number));
      this.loading.set(false);
    });
  }

  protected setFinal(take: TakeItem): void {
    this.loadingId.set(take.id);
    this.http.patch(`${this.apiUrl}/takes/${take.id}`, { final: true }).pipe(
      catchError(() => of(null)),
    ).subscribe({
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
