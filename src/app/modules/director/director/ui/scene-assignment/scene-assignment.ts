import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
  input,
  output,
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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '@environment/environment';
import { PresetsService } from '@core/stores/presets.service';
import { SceneAssignments, SceneAssetAssignment } from '@core/interfaces/seedance.interface';
import { Preset } from '@core/interfaces/studio.models';
import { TranslateModule } from '@ngx-translate/core';
import { SourceAssetPipe, SourceThumbnailAssetPipe } from '@app/core/pipes';
import { FileUploadHandlerEvent, FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { IndexCharacters } from '@app/modules/characters/characters/ui/index-characters/index-characters';
import { FilesApiService } from '@app/services';
import { UploadParams } from '@app/core/interfaces';
import { INFER_CATEGORY } from '@app/shared/utils';
import { AssetViewerComponent } from '@shared/components/asset-viewer/asset-viewer.component';
import {
  AssetType,
  Character,
  CharacterMetadata,
} from '@app/modules/characters/characters/interfaces';
import { CharactersService } from '@app/modules/characters/characters/services';

interface ProjectInfo {
  name: string;
  description: string;
}

/** Minimal shape that AssetViewerComponent accepts. */
interface FileLike {
  id: string;
  filename?: string;
  mimeType?: string;
  mime_type?: string;
  size?: number;
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
  slot?: string;
}

@Component({
  selector: 'app-scene-assignment',
  standalone: true,
  imports: [
    ButtonModule,
    SelectModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    DecimalPipe,
    FileUploadModule,
    TranslateModule,
    SourceThumbnailAssetPipe,
    SourceAssetPipe,
    IndexCharacters,
    AssetViewerComponent,
  ],
  providers: [ConfirmationService, MessageService],
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
  private readonly confirm = inject(ConfirmationService);
  private readonly charSvc = inject(CharactersService);
  private readonly apiUrl = environment.API_URL;

  /** Optional inputs when used inside a dialog (no route params). */
  readonly projectIdInput = input<string>('');
  readonly sceneIdInput = input<string>('');
  /** Chapter mode (episode-level assignments). When provided, resources are
   *  assigned to the chapter instead of a scene. */
  readonly chapterIdInput = input<string>('');
  /** Pre-resolved names so no extra API calls are needed in dialog mode. */
  readonly projectNameInput = input<string>('');
  readonly sceneNumberInput = input<number>(0);
  readonly sceneNameInput = input<string>('');
  readonly chapterNumberInput = input<number>(0);
  readonly chapterNameInput = input<string>('');

  /** Emitted after any assignment change. */
  readonly assignmentsChanged = output<void>();

  /** Resolved project/scene IDs: prefer inputs, fall back to route params. */
  private readonly routeProjectId = toSignal(
    this.route.params.pipe(map((p) => p['projectId'])),
    { initialValue: '' },
  );
  private readonly routeSceneId = toSignal(
    this.route.params.pipe(map((p) => p['sceneId'])),
    { initialValue: '' },
  );
  protected readonly projectId = computed(() => this.projectIdInput() || this.routeProjectId());
  protected readonly sceneId = computed(() => this.sceneIdInput() || this.routeSceneId());
  protected readonly chapterId = computed(() => this.chapterIdInput());

  /** True when the component is assigning resources at chapter level. */
  protected readonly isChapterMode = computed(() => Boolean(this.chapterId()));

  /** Assignment API base path — chapter endpoints when in chapter mode,
   *  scene endpoints otherwise (director route / projects dialog). */
  private assignmentBase(): string {
    const pid = this.projectId();
    if (!pid) return '';
    const cid = this.chapterId();
    if (cid) return `${this.apiUrl}/projects/${pid}/chapters/${cid}/assignments`;
    const sid = this.sceneId();
    if (sid) return `${this.apiUrl}/projects/${pid}/scenes/${sid}/assignments`;
    return '';
  }

  protected readonly tabs = [
    { key: 'characters', label: 'Resources' },
    // { key: 'assets', label: 'Temp' },
    // { key: 'presets', label: 'Presets' },
  ];
  protected readonly activeTab = signal<string>('characters');
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

  protected readonly searchQuery = signal('');
  protected readonly characterDialogVisible = signal(false);
  protected readonly previewFile = signal<FileLike | null>(null);
  protected readonly previewVisible = signal(false);

  /** Available characters grouped by asset type, filtered by searchQuery. */
  protected readonly groupedCharacters = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const chars = query
      ? this.availableCharacters().filter((c) => c.name.toLowerCase().includes(query))
      : this.availableCharacters();

    const groups: Record<string, typeof chars> = {};
    for (const c of chars) {
      const key = c.assetType || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return groups;
  });

  /** Asset-type tabs — resources are segmented by their semantic type
   *  (character / location / prop / audio), not by the file kind. */
  protected readonly kindTabs: AssetType[] = ['character', 'location', 'prop', 'audio'];
  protected readonly activeKindTab = signal<AssetType>('character');

  /** Human label for each asset type. */
  protected readonly kindLabel: Record<string, string> = {
    character: 'Characters',
    location: 'Locations',
    prop: 'Props',
    audio: 'Audio',
    other: 'Other',
  };

  /** Characters for the currently active asset-type tab, filtered by search. */
  protected readonly tabCharacters = computed(() => {
    const active = this.activeKindTab();
    return this.groupedCharacters()[active] || [];
  });

  constructor() {
    // No side-effects in constructor — all loading happens in ngOnInit.
  }

  ngOnInit(): void {
    // Route-based loading
    this.route.params
      .pipe(
        map((p) => ({ projectId: p['projectId'], sceneId: p['sceneId'] })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((params) => {
        if (params.sceneId) {
          this.startLoad(params.projectId, params.sceneId);
        }
      });

    // Input-based loading (dialog mode) — load immediately with inputs.
    const pid = this.projectId();
    const sid = this.sceneId();
    const cid = this.chapterId();
    if (cid && !this.routeSceneId()) {
      this.startLoad(pid, '');
    } else if (sid && !this.routeSceneId()) {
      this.startLoad(pid, sid);
    }
  }

  private startLoad(pid: string, sid: string): void {
    this.loadInfo(pid, sid);
    this.loadAll(pid);
  }

  private loadInfo(projectId: string, sceneId: string): void {
    // Chapter mode — show the episode info (names passed by the dialog).
    if (this.isChapterMode()) {
      this.projectInfo.set({
        name: this.projectNameInput(),
        description: '',
      });
      this.sceneInfo.set({
        number: this.chapterNumberInput(),
        name: this.chapterNameInput(),
        description: '',
      });
      return;
    }

    // If pre-resolved names are provided, use them immediately
    if (this.projectNameInput() && this.sceneNameInput()) {
      this.projectInfo.set({
        name: this.projectNameInput(),
        description: '',
      });
      this.sceneInfo.set({
        number: this.sceneNumberInput(),
        name: this.sceneNameInput(),
        description: '',
      });
      return;
    }

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

  private loadAll(projectId: string): void {
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

    // Load assignments for this chapter/scene
    this.loadAssignments(projectId);
  }

  private loadAssignments(projectId: string): void {
    const base = this.assignmentBase();
    if (!base) {
      this.loading.set(false);
      return;
    }
    this.http
      .get<{ data: SceneAssignments }>(base)
      .pipe(catchError(() => of({ data: { presets: [], characters: [], assets: [] } })))
      .subscribe({
        next: (res) => {
          const d = res?.data;
          this.assignedPresets.set(d?.presets || []);
          this.assignedCharacters.set(d?.characters || []);
          this.assignedAssets.set(d?.assets || []);
          this.computeAvailablePresets();
          this.computeAvailableCharacters();
          this.computeAvailableAssets();
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
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
        .map((c: any) => {
          let metadata: CharacterMetadata = {};
          try {
            metadata = c.character?.metadata ? JSON.parse(c.character.metadata) : {};
          } catch {
            metadata = {};
          }
          const assetType: AssetType = metadata.assetType ?? 'character';
          const kind = metadata.fileKind ?? 'image';
          return {
            id: c.character?.id || c.id,
            name: c.character?.name || c.name,
            assetType,
            kind,
            thumbnailUrl:
              kind === 'audio'
                ? c.files?.[0]?.url || ''
                : c.files?.find((f: any) => f.role === 'portrait')?.thumbnail_url ||
                  c.files?.[0]?.thumbnail_url ||
                  '',
          };
        }),
    );
  }

  private computeAvailableAssets(): void {
    const assignedIds = new Set(this.assignedAssets().map((a) => a.file_id));
    this.availableAssets.set(this.allFiles().filter((f: any) => !assignedIds.has(f.id)));
  }

  assignPreset(presetId: string): void {
    const base = this.assignmentBase();
    if (!base) return;
    this.http
      .post(`${base}/presets`, {
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
    const base = this.assignmentBase();
    if (!base) return;
    this.http
      .delete(`${base}/presets/${assignmentId}`)
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Preset removed', life: 2000 });
          this.reload();
        },
        error: () =>
          this.toast.add({ severity: 'error', summary: 'Failed to remove preset', life: 3000 }),
      });
  }

  private prefixForKind(kind: string): string {
    if (kind === 'video') return 'video';
    if (kind === 'audio') return 'audio';
    return 'image';
  }

  private nextSlot(kind: string): string {
    const prefix = this.prefixForKind(kind);
    const assigned = this.assignedCharacters();
    const usedSlots = new Set(assigned.map((a: any) => a.slot).filter(Boolean));
    let n = 1;
    while (usedSlots.has(`@${prefix}${n}`)) {
      n++;
    }
    return `@${prefix}${n}`;
  }

  assignCharacter(characterId: string, kind?: string): void {
    const base = this.assignmentBase();
    if (!base) return;
    this.http
      .post(`${base}/characters`, {
        character_id: characterId,
        slot: this.nextSlot(kind || 'image'),
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
    const base = this.assignmentBase();
    if (!base) return;
    this.http
      .delete(`${base}/characters/${assignmentId}`)
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Character removed', life: 2000 });
          this.reload();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  /**
   * Auto-assign resources created via the mass-upload button in the embedded
   * resource library. Only applies in episode (chapter) mode — scene mode
   * leaves the new resources unassigned for the user to place manually.
   * Asks for confirmation first; on acceptance, assigns the whole batch.
   */
  protected onMassCreated(evt: { ids: string[]; kind: string }): void {
    if (!this.isChapterMode() || evt.ids.length === 0) return;
    this.confirm.confirm({
      header: 'Auto-assign to episode',
      message: `Assign the ${evt.ids.length} created resource(s) to this episode automatically?`,
      acceptLabel: 'Assign',
      rejectLabel: 'Cancel',
      accept: () => this.autoAssignToEpisode(evt),
    });
  }

  /** POST one chapter assignment per created id, with unique slots. */
  private autoAssignToEpisode(evt: { ids: string[]; kind: string }): void {
    const base = this.assignmentBase();
    if (!base) return;

    // Compute unique slots across the whole batch up front so nothing
    // collides on @image1/@audio1 (assignedCharacters() only refreshes
    // after this request completes).
    const prefix = this.prefixForKind(evt.kind);
    const usedSlots = new Set(
      this.assignedCharacters().map((a) => a.slot).filter(Boolean) as string[],
    );
    const nextFreeSlot = (): string => {
      let n = 1;
      while (usedSlots.has(`@${prefix}${n}`)) n++;
      const slot = `@${prefix}${n}`;
      usedSlots.add(slot);
      return slot;
    };

    forkJoin(
      evt.ids.map((id) =>
        this.http.post(`${base}/characters`, { character_id: id, slot: nextFreeSlot() }),
      ),
    ).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Assigned to episode',
          detail: `${evt.ids.length} resources assigned`,
          life: 3000,
        });
        this.reload();
      },
      error: () =>
        this.toast.add({
          severity: 'error',
          summary: 'Failed to assign resources',
          life: 3000,
        }),
    });
  }

  assignAsset(fileId: string): void {
    const base = this.assignmentBase();
    if (!base) return;
    this.http
      .post(`${base}/assets`, { file_id: fileId })
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Asset assigned', life: 2000 });
          this.reload();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  removeAsset(assignmentId: string): void {
    const base = this.assignmentBase();
    if (!base) return;
    this.http
      .delete(`${base}/assets/${assignmentId}`)
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Asset removed', life: 2000 });
          this.reload();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Failed', life: 3000 }),
      });
  }

  protected openPreview(file: FileLike): void {
    this.previewFile.set(file);
    this.previewVisible.set(true);
  }

  deleteFile(f: FileLike): void {
    this.confirm.confirm({
      header: 'Delete file',
      message: `Move "${f.filename}" to trash?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.onDeleteFromViewer(f.id),
    });
  }

  deleteCharacter(p: Character) {
    this.confirm.confirm({
      header: 'Delete Character',
      message: `Are you sure you want to delete "${p.name}"?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.onDeleteCharater(p.id),
    });
  }

  private onDeleteCharater(id: string) {
    this.charSvc.delete(id).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({ severity: 'success', summary: 'OK', detail: 'Deleted' });
      this.reload();
      this.loadAll(this.projectId());
    });
  }

  protected onDeleteCharacter(id: string): void {
    this.charSvc.delete(id).subscribe({
      next: (res) => {
        this.previewVisible.set(false);
        this.previewFile.set(null);
        this.toast.add({ severity: 'success', summary: res.msg, life: 2000 });
        this.reload();
        this.loadAll(this.projectId());
      },
      error: () =>
        this.toast.add({ severity: 'error', summary: 'Failed to delete character', life: 3000 }),
    });
  }

  protected onDeleteFromViewer(id: string): void {
    this.fileSvc.delete(id).subscribe({
      next: (res) => {
        this.previewVisible.set(false);
        this.previewFile.set(null);
        this.toast.add({ severity: 'success', summary: res.msg, life: 2000 });
        this.reload();
        this.loadAll(this.projectId());
      },
      error: () =>
        this.toast.add({ severity: 'error', summary: 'Failed to delete file', life: 3000 }),
    });
  }

  private reload(): void {
    const pid = this.projectId();
    if (pid && this.assignmentBase()) {
      this.loadAssignments(pid);
      this.assignmentsChanged.emit();
    }
  }

  onCharactersChanged(): void {
    const pid = this.projectId();
    if (pid) this.loadAll(pid);
  }

  uploadFile(ev: FileUploadHandlerEvent) {
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
        this.loadAll(this.projectId());
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Failed to upload', life: 3000 }),
    });
    this.fileUploadLoading.set(false);
  }
}
