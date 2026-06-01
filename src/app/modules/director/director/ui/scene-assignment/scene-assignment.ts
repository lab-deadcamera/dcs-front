import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, of, forkJoin } from 'rxjs';
import { DecimalPipe } from '@angular/common';
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
import { TranslateModule } from '@ngx-translate/core';
import { SourceAssetPipe, SourceThumbnailAssetPipe } from '@app/core/pipes';
import { FileUploadEvent, FileUploadHandlerEvent, FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { IndexCharacters } from '@app/modules/characters/characters/ui/index-characters/index-characters';
import { FilesApiService } from '@app/services';
import { UploadParams } from '@app/core/interfaces';
import { INFER_CATEGORY } from '@app/shared/utils';

interface ProjectInfo {
  name: string;
  description: string;
}

interface SceneInfo {
  number: number;
  name: string;
  description: string;
}

interface SceneAssignmentItem {
  id: string;
  preset_id?: string;
  character_id?: string;
  name?: string;
  label?: string;
  group_slug?: string;
}

@Component({
  selector: 'app-scene-assignment',
  standalone: true,
  imports: [
    ButtonModule,
    SelectModule,
    DialogModule,
    ToastModule,
    DecimalPipe,
    FileUploadModule,
    TranslateModule,
    SourceThumbnailAssetPipe,
    SourceAssetPipe,
    IndexCharacters,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scene-assignment.html',
})
export class SceneAssignmentComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(MessageService);
  private readonly presetsSvc = inject(PresetsService);
  private readonly fileSvc = inject(FilesApiService);
  private readonly apiUrl = environment.API_URL;

  protected readonly projectId = toSignal(this.route.params.pipe(map((p) => p['projectId'])), {
    initialValue: '',
  });
  protected readonly sceneId = toSignal(this.route.params.pipe(map((p) => p['sceneId'])), {
    initialValue: '',
  });

  protected readonly tabs = [
    { key: 'presets', label: 'Presets' },
    { key: 'characters', label: 'Characters' },
    { key: 'assets', label: 'Assets' },
  ];
  protected readonly activeTab = signal<string>('presets');
  protected readonly loading = signal(false);
  protected readonly fileUploadLoading = signal(false);

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

  protected readonly characterDialogVisible = signal(false);

  constructor() {
    effect(() => {
      if (this.characterDialogVisible() != undefined) {
        this.onCharactersChanged();
      }
    });
  }

  ngOnInit(): void {
    this.route.params
      .pipe(
        map((p) => ({ projectId: p['projectId'], sceneId: p['sceneId'] })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((params) => {
        if (params.sceneId) {
          this.loadSceneInfo(params.projectId, params.sceneId);
          this.loadAll(params.projectId, params.sceneId);
        }
      });
  }

  private loadSceneInfo(projectId: string, sceneId: string): void {
    // Load project name
    if (projectId) {
      this.http
        .get<{ data: any }>(`${this.apiUrl}/projects/${projectId}`)
        .pipe(catchError(() => of({ data: null })))
        .subscribe((res) => {
          if (res.data) {
            this.projectInfo.set({
              name: res.data.project?.name || res.data.name,
              description: res.data.project?.description || '',
            });
          }
        });
    }
    // Load scene name/number
    if (sceneId) {
      this.http
        .get<{ data: any }>(`${this.apiUrl}/projects/${projectId}/scenes/${sceneId}`)
        .pipe(catchError(() => of({ data: null })))
        .subscribe((res) => {
          if (res.data) {
            const s = res.data.scene || res.data;
            this.sceneInfo.set({
              number: s.number,
              name: s.name,
              description: s.description || '',
            });
          }
        });
    }
  }

  private loadAll(projectId: string, sceneId: string): void {
    this.loading.set(true);

    // Load files
    this.http
      .get<any>(`${this.apiUrl}/files`)
      .pipe(catchError(() => of({ data: [] })))
      .subscribe((res) => {
        this.allFiles.set(res.data || []);
        this.computeAvailableAssets();
      });

    // Load characters
    this.http
      .get<any>(`${this.apiUrl}/characters`)
      .pipe(catchError(() => of({ data: [] })))
      .subscribe((res) => {
        this.allCharacters.set(res.data || []);
        this.computeAvailableCharacters();
      });

    // Load assignments for this scene
    this.loadAssignments(projectId, sceneId);
  }

  private loadAssignments(projectId: string, sceneId: string): void {
    this.http
      .get<{ data: SceneAssignments }>(
        `${this.apiUrl}/projects/${projectId}/scenes/${sceneId}/assignments`,
      )
      .pipe(catchError(() => of({ data: { presets: [], characters: [], assets: [] } })))
      .subscribe((res) => {
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
      this.allCharacters()
        .filter((c: any) => !assignedIds.has(c.character?.id || c.id))
        .map((c: any) => ({
          id: c.character?.id || c.id,
          name: c.character?.name || c.name,
          thumbnailUrl:
            c.files?.find((f: any) => f.role === 'portrait')?.thumbnail_url ||
            c.files?.[0]?.thumbnail_url ||
            '',
        })),
    );
  }

  private computeAvailableAssets(): void {
    const assignedIds = new Set(this.assignedAssets().map((a) => a.file_id));
    this.availableAssets.set(this.allFiles().filter((f: any) => !assignedIds.has(f.id)));
  }

  assignPreset(presetId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http
      .post(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/presets`, {
        preset_id: presetId,
      })
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Preset assigned', life: 2000 });
          this.reload();
        },
        error: () =>
          this.toast.add({ severity: 'error', summary: 'Failed to assign preset', life: 3000 }),
      });
  }

  removePreset(assignmentId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http
      .delete(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/presets/${assignmentId}`)
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Preset removed', life: 2000 });
          this.reload();
        },
        error: () =>
          this.toast.add({ severity: 'error', summary: 'Failed to remove preset', life: 3000 }),
      });
  }

  assignCharacter(characterId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http
      .post(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/characters`, {
        character_id: characterId,
      })
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Character assigned', life: 2000 });
          this.reload();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  removeCharacter(assignmentId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http
      .delete(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/characters/${assignmentId}`)
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Character removed', life: 2000 });
          this.reload();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  assignAsset(fileId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http
      .post(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/assets`, { file_id: fileId })
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Asset assigned', life: 2000 });
          this.reload();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  removeAsset(assignmentId: string): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (!pid || !sid) return;
    this.http
      .delete(`${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments/assets/${assignmentId}`)
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Asset removed', life: 2000 });
          this.reload();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  private reload(): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (pid && sid) this.loadAssignments(pid, sid);
  }

  onCharactersChanged(): void {
    const pid = this.projectId();
    const sid = this.sceneId();
    if (pid && sid) this.loadAll(pid, sid);
  }

  uploadFile(ev: FileUploadHandlerEvent) {
    console.log('file selected');
    this.fileUploadLoading.set(true);

    if (!ev.files.length) {
      this.fileUploadLoading.set(false);
      return;
    }

    const requests = forkJoin(
      ev.files.map((file) => {
        const payload: UploadParams = {
          file,
          category: INFER_CATEGORY(file),
          storage: 'persistent',
        };
        return this.fileSvc.upload(payload);
      }),
    );

    requests.subscribe({
      next: (res) => {
        this.toast.add({ severity: 'success', summary: 'Files uploaded', life: 2000 });
        this.reload();
        this.loadAll(this.projectId(), this.sceneId());
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Failed to upload', life: 3000 }),
    });
    this.fileUploadLoading.set(false);
  }
}
