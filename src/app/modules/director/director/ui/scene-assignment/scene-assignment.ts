import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, of } from 'rxjs';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '@environment/environment';
import { PresetsService } from '@core/stores/presets.service';
import { SceneAssignments, SceneAssetAssignment } from '@core/interfaces/seedance.interface';
import { Preset } from '@core/interfaces/studio.models';

interface ProjectInfo {
  name: string;
  description: string;
}

interface SceneInfo {
  number: number;
  name: string;
  description: string;
}

@Component({
  selector: 'app-scene-assignment',
  standalone: true,
  imports: [DatePipe, ButtonModule, SelectModule, ToastModule],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-6">
      <div class="mb-6">
        <h1 class="text-[18px] font-bold uppercase tracking-[0.12em]">Scene Resources</h1>
        <p class="mt-1 text-[12px] text-fg-muted">
          Assign and remove resources for this scene
        </p>
      </div>

      <!-- Scene & Project info -->
      <div class="mb-6 rounded border border-ink-700 bg-ink-800 p-4">
        <div class="mb-3 flex items-center gap-4">
          <span class="font-mono text-[11px] text-primary-400">SC{{ (sceneInfo()?.number ?? 0) | number: '2.0' }}</span>
          <span class="text-[14px] font-semibold">{{ sceneInfo()?.name || 'Loading...' }}</span>
          @if (sceneInfo()?.description) {
            <span class="text-[12px] text-fg-muted">— {{ sceneInfo()?.description }}</span>
          }
        </div>
        <div class="flex gap-6 text-[11px] text-fg-muted">
          <span><span class="font-bold uppercase">Project:</span> {{ projectInfo()?.name || '...' }}</span>
          <span><span class="font-bold uppercase">Scene ID:</span> <span class="font-mono">{{ sceneId() }}</span></span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-4 flex gap-2 border-b border-ink-600">
        @for (tab of tabs; track tab.key) {
          <button
            type="button"
            class="border-b-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors"
            [class.border-primary-500 !text-fg-strong]="activeTab() === tab.key"
            [class.border-transparent text-fg-muted]="activeTab() !== tab.key"
            (click)="activeTab.set(tab.key)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <p class="py-8 text-center text-[13px] italic text-fg-muted">Loading...</p>
      }

      <!-- Presets tab -->
      @if (!loading() && activeTab() === 'presets') {
        <div class="grid grid-cols-2 gap-6">
          <div>
            <h2 class="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted">Available Presets</h2>
            <div class="flex flex-col gap-1">
              @for (p of availablePresets(); track p.id) {
                <div class="flex items-center justify-between rounded border border-ink-700 bg-ink-800 px-3 py-2">
                  <div class="min-w-0 flex-1">
                    <span class="text-[12px] font-semibold">{{ p.label }}</span>
                    <span class="ml-2 text-[10px] text-fg-muted">{{ p.labelKey }}</span>
                  </div>
                  <button
                    type="button"
                    class="rounded px-2 py-1 text-[10px] font-bold uppercase text-primary-400 transition-colors hover:bg-primary-500/20"
                    (click)="assignPreset(p.id)"
                  >+ Assign</button>
                </div>
              }
              @if (availablePresets().length === 0) {
                <p class="py-4 text-center text-[12px] text-fg-muted">All presets assigned.</p>
              }
            </div>
          </div>
          <div>
            <h2 class="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted">Assigned</h2>
            <div class="flex flex-col gap-1">
              @for (a of assignedPresets(); track a.id) {
                <div class="flex items-center justify-between rounded border border-ink-700 bg-ink-800 px-3 py-2">
                  <span class="text-[12px]">{{ a.label }} <span class="text-[10px] text-fg-muted">({{ a.group_slug }})</span></span>
                  <button
                    type="button"
                    class="rounded px-2 py-1 text-[10px] font-bold uppercase text-red-400 transition-colors hover:bg-red-500/20"
                    (click)="removePreset(a.id)"
                  >Remove</button>
                </div>
              }
              @if (assignedPresets().length === 0) {
                <p class="py-4 text-center text-[12px] text-fg-muted">No presets assigned.</p>
              }
            </div>
          </div>
        </div>
      }

      <!-- Characters tab -->
      @if (!loading() && activeTab() === 'characters') {
        <div class="grid grid-cols-2 gap-6">
          <div>
            <h2 class="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted">Available Characters</h2>
            <div class="flex flex-col gap-1">
              @for (c of availableCharacters(); track c.id) {
                <div class="flex items-center justify-between rounded border border-ink-700 bg-ink-800 px-3 py-2">
                  <span class="text-[12px]">{{ c.name }}</span>
                  <button
                    type="button"
                    class="rounded px-2 py-1 text-[10px] font-bold uppercase text-primary-400 transition-colors hover:bg-primary-500/20"
                    (click)="assignCharacter(c.id)"
                  >+ Assign</button>
                </div>
              }
              @if (availableCharacters().length === 0) {
                <p class="py-4 text-center text-[12px] text-fg-muted">All characters assigned.</p>
              }
            </div>
          </div>
          <div>
            <h2 class="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted">Assigned</h2>
            <div class="flex flex-col gap-1">
              @for (a of assignedCharacters(); track a.id) {
                <div class="flex items-center justify-between rounded border border-ink-700 bg-ink-800 px-3 py-2">
                  <span class="text-[12px]">{{ a.name }}</span>
                  <button
                    type="button"
                    class="rounded px-2 py-1 text-[10px] font-bold uppercase text-red-400 transition-colors hover:bg-red-500/20"
                    (click)="removeCharacter(a.id)"
                  >Remove</button>
                </div>
              }
              @if (assignedCharacters().length === 0) {
                <p class="py-4 text-center text-[12px] text-fg-muted">No characters assigned.</p>
              }
            </div>
          </div>
        </div>
      }

      <!-- Assets tab -->
      @if (!loading() && activeTab() === 'assets') {
        <div class="grid grid-cols-2 gap-6">
          <div>
            <h2 class="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted">Available Files</h2>
            <div class="flex flex-col gap-1">
              @for (f of availableAssets(); track f.id) {
                <div class="flex items-center justify-between rounded border border-ink-700 bg-ink-800 px-3 py-2">
                  <div class="min-w-0 flex-1">
                    <span class="truncate text-[12px]">{{ f.filename }}</span>
                    <span class="ml-2 text-[10px] text-fg-muted">{{ f.mime_type }}</span>
                  </div>
                  <button
                    type="button"
                    class="rounded px-2 py-1 text-[10px] font-bold uppercase text-primary-400 transition-colors hover:bg-primary-500/20"
                    (click)="assignAsset(f.id)"
                  >+ Assign</button>
                </div>
              }
              @if (availableAssets().length === 0) {
                <p class="py-4 text-center text-[12px] text-fg-muted">All files assigned.</p>
              }
            </div>
          </div>
          <div>
            <h2 class="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted">Assigned</h2>
            <div class="flex flex-col gap-1">
              @for (a of assignedAssets(); track a.id) {
                <div class="flex items-center justify-between rounded border border-ink-700 bg-ink-800 px-3 py-2">
                  <div class="min-w-0 flex-1">
                    <span class="truncate text-[12px]">{{ a.filename }}</span>
                    <span class="ml-2 text-[10px] text-fg-muted">{{ a.mime_type }}</span>
                  </div>
                  <button
                    type="button"
                    class="rounded px-2 py-1 text-[10px] font-bold uppercase text-red-400 transition-colors hover:bg-red-500/20"
                    (click)="removeAsset(a.id)"
                  >Remove</button>
                </div>
              }
              @if (assignedAssets().length === 0) {
                <p class="py-4 text-center text-[12px] text-fg-muted">No assets assigned.</p>
              }
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class SceneAssignmentComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(MessageService);
  private readonly presetsSvc = inject(PresetsService);
  private readonly apiUrl = environment.API_URL;

  protected readonly projectId = toSignal(
    this.route.params.pipe(map((p) => p['projectId'])),
    { initialValue: '' },
  );
  protected readonly sceneId = toSignal(
    this.route.params.pipe(map((p) => p['sceneId'])),
    { initialValue: '' },
  );

  protected readonly tabs = [
    { key: 'presets', label: 'Presets' },
    { key: 'characters', label: 'Characters' },
    { key: 'assets', label: 'Assets' },
  ];
  protected readonly activeTab = signal<string>('presets');
  protected readonly loading = signal(false);

  protected readonly projectInfo = signal<ProjectInfo | null>(null);
  protected readonly sceneInfo = signal<SceneInfo | null>(null);

  // Raw lists from API
  protected readonly allFiles = signal<any[]>([]);
  protected readonly allCharacters = signal<any[]>([]);

  // Assigned resources
  protected readonly assignedPresets = signal<SceneAssignmentItem[]>([]);
  protected readonly assignedCharacters = signal<SceneAssignmentItem[]>([]);
  protected readonly assignedAssets = signal<SceneAssetAssignment[]>([]);

  // Computed available lists
  protected readonly availablePresets = signal<Preset[]>([]);
  protected readonly availableCharacters = signal<any[]>([]);
  protected readonly availableAssets = signal<any[]>([]);

  ngOnInit(): void {
    this.route.params.pipe(
      map((p) => ({ projectId: p['projectId'], sceneId: p['sceneId'] })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((params) => {
      if (params.sceneId) {
        this.loadSceneInfo(params.projectId, params.sceneId);
        this.loadAll(params.projectId, params.sceneId);
      }
    });
  }

  private loadSceneInfo(projectId: string, sceneId: string): void {
    // Load project name
    if (projectId) {
      this.http.get<{ data: any }>(`${this.apiUrl}/projects/${projectId}`).pipe(
        catchError(() => of({ data: null })),
      ).subscribe((res) => {
        if (res.data) {
          this.projectInfo.set({ name: res.data.project?.name || res.data.name, description: res.data.project?.description || '' });
        }
      });
    }
    // Load scene name/number
    if (sceneId) {
      this.http.get<{ data: any }>(`${this.apiUrl}/projects/${projectId}/scenes/${sceneId}`).pipe(
        catchError(() => of({ data: null })),
      ).subscribe((res) => {
        if (res.data) {
          const s = res.data.scene || res.data;
          this.sceneInfo.set({ number: s.number, name: s.name, description: s.description || '' });
        }
      });
    }
  }

  private loadAll(projectId: string, sceneId: string): void {
    this.loading.set(true);

    // Load files
    this.http.get<any>(`${this.apiUrl}/files`).pipe(
      catchError(() => of({ data: [] })),
    ).subscribe((res) => {
      this.allFiles.set(res.data || []);
      this.computeAvailableAssets();
    });

    // Load characters
    this.http.get<any>(`${this.apiUrl}/characters`).pipe(
      catchError(() => of({ data: [] })),
    ).subscribe((res) => {
      this.allCharacters.set(res.data || []);
      this.computeAvailableCharacters();
    });

    // Load assignments for this scene
    this.loadAssignments(projectId, sceneId);
  }

  private loadAssignments(projectId: string, sceneId: string): void {
    this.http.get<{ data: SceneAssignments }>(
      `${this.apiUrl}/projects/${projectId}/scenes/${sceneId}/assignments`,
    ).pipe(
      catchError(() => of({ data: { presets: [], characters: [], assets: [] } })),
    ).subscribe((res) => {
      const d = res.data;
      this.assignedPresets.set(d.presets || []);
      this.assignedCharacters.set(d.characters || []);
      this.assignedAssets.set(d.assets || []);
      this.computeAvailablePresets();
      this.computeAvailableCharacters();
      this.computeAvailableAssets();
      this.loading.set(false);
    });
  }

  private computeAvailablePresets(): void {
    const assignedIds = new Set(this.assignedPresets().map((a) => a.preset_id));
    const allPresets = [
      ...this.presetsSvc.lens(),
      ...this.presetsSvc.camera(),
      ...this.presetsSvc.cameraMotion(),
      ...this.presetsSvc.colorGrading(),
      ...this.presetsSvc.genre(),
    ];
    this.availablePresets.set(allPresets.filter((p) => !assignedIds.has(p.id)));
  }

  private computeAvailableCharacters(): void {
    const assignedIds = new Set(this.assignedCharacters().map((a) => a.character_id));
    this.availableCharacters.set(
      this.allCharacters().filter((c: any) => !assignedIds.has(c.id)),
    );
  }

  private computeAvailableAssets(): void {
    const assignedIds = new Set(this.assignedAssets().map((a) => a.file_id));
    this.availableAssets.set(
      this.allFiles().filter((f: any) => !assignedIds.has(f.id)),
    );
  }

  assignPreset(presetId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http.post(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/presets`, { preset_id: presetId })
      .subscribe({
        next: () => { this.toast.add({ severity: 'success', summary: 'Preset assigned', life: 2000 }); this.reload(); },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed to assign preset', life: 3000 }),
      });
  }

  removePreset(assignmentId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http.delete(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/presets/${assignmentId}`)
      .subscribe({
        next: () => { this.toast.add({ severity: 'success', summary: 'Preset removed', life: 2000 }); this.reload(); },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed to remove preset', life: 3000 }),
      });
  }

  assignCharacter(characterId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http.post(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/characters`, { character_id: characterId })
      .subscribe({
        next: () => { this.toast.add({ severity: 'success', summary: 'Character assigned', life: 2000 }); this.reload(); },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  removeCharacter(assignmentId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http.delete(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/characters/${assignmentId}`)
      .subscribe({
        next: () => { this.toast.add({ severity: 'success', summary: 'Character removed', life: 2000 }); this.reload(); },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  assignAsset(fileId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http.post(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/assets`, { file_id: fileId })
      .subscribe({
        next: () => { this.toast.add({ severity: 'success', summary: 'Asset assigned', life: 2000 }); this.reload(); },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  removeAsset(assignmentId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http.delete(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/assets/${assignmentId}`)
      .subscribe({
        next: () => { this.toast.add({ severity: 'success', summary: 'Asset removed', life: 2000 }); this.reload(); },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  private reload(): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (pid && sid) this.loadAssignments(pid, sid);
  }
}

interface SceneAssignmentItem {
  id: string;
  preset_id?: string;
  character_id?: string;
  name?: string;
  label?: string;
  group_slug?: string;
}
