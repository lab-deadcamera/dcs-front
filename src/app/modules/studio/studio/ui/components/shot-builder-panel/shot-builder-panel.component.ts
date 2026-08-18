import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SplitterModule } from 'primeng/splitter';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { Popover } from 'primeng/popover';
import { MessageService } from 'primeng/api';
import { StudioStore } from '@app/core/stores/studio.store';
import { SessionStore } from '@app/core/stores/session.store';
import {
  ShotBuilderService,
  ShotBuilderShot,
  ShotBuilderResult,
  SceneData,
  EpisodeData,
  SceneContext,
  ShotRefineTarget,
  ChatTurn,
  normalizeSeedanceSlots,
  shotBuilderResultToSequence,
} from '@app/services/shot-builder.service';
import { ShotBuilderSettingsDialogComponent } from './components/shot-builder-settings-dialog.component';
import { AssetViewerComponent } from '@shared/components/asset-viewer/asset-viewer.component';

/** Parse .docx files into HTML for preview. */
import * as mammoth from 'mammoth';
/** Parse .xlsx files into structured data for preview. */
import * as XLSX from 'xlsx';
/** Parse .pdf files into readable text for sending to Claude. */
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
// The worker is copied to assets in angular.json; referenced by an absolute
// URL (root-relative) so it resolves from any router path. Angular's esbuild
// bundler does not support Vite-style `?url` imports, so we copy the file and
// point at it explicitly.
GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.mjs';
/** Render structured shot data as artifact HTML. */
import {
  generateArtifactHtml,
  parseArtifactData,
  computeCharacterCount,
} from '@app/services/shot-builder-artifact';
/** A real generate-shots response (Episode → Scenes → Shots) used by the Mock Seq button. */
import responseOkMock from '@app/core/mocks/response-07-08.json';
import { Reference, Sequence } from '@app/core/interfaces';
import { ShotSequenceViewerComponent } from './components/shot-sequence-viewer.component';
import { CLAUDE_MODELS, LEVEL_ROL } from '@app/core/constants';
import { ModelService } from '@app/services/model.service';
import { FileCategory } from '@app/core/interfaces';
import { AspectRatio, ReferenceAsset } from '@app/core/interfaces/studio.models';
import { SourceAssetPipe } from '@app/core/pipes/source-asset.pipe';
import { StudioApiService } from '@app/services/studio-api.service';
import { ProjectsApiService } from '@app/modules/projects/projects/services/projects-api.service';
import { FilesApiService } from '@app/services/files-api.service';
import { SourceThumbnailAssetPipe } from '@app/core/pipes';
import { CONSOLE, ResolvedRefInfo, inferKind, resolveReferenceInfo } from '@app/shared/utils';
import { CharactersApiService } from '@app/modules/characters/characters/services/characters-api.service';
import { AssetType, CharacterMetadata } from '@app/modules/characters/characters/interfaces';
import { environment } from '@environment/environment';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

/**
 * System prompts are now managed server-side in the backend handler.
 * The frontend sends system_prompt as empty string, and the backend
 * applies the appropriate system prompt based on the endpoint:
 *   - ClaudeGenerateShots  → shot builder system prompt (JSON shot list)
 *   - ClaudeOptimizePrompt → proncer system prompt (refine prompts only)
 */
const SHOT_BUILDER_SYSTEM_PROMPT = '';

/** Aspect ratios the video backend accepts (mirrors backend ValidRatios). */
const SUPPORTED_ASPECT_RATIOS = new Set([
  '16:9',
  '9:16',
  '1:1',
  '4:3',
  '3:4',
  '21:9',
  '9:21',
  '2.35:1',
]);

/** Safety cap for a single generated shot's duration, in seconds. */
const MAX_SHOT_DURATION_SECONDS = 15;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  /** Whether this message belongs to a generate or a refine turn (badge). */
  kind?: 'generate' | 'refine';
  /** Shots this turn was scoped to (per-shot refine). */
  targets?: ShotRefineTarget[];
  /** The parsed breakdown for assistant generate/refine turns — rendered
   *  inline in the chat so versions accumulate and can be restored. */
  result?: ShotBuilderResult;
};

type UploadedFile = {
  name: string;
  content: string;
  mimeType: string;
  /** Text to send to Claude. Set for PDFs (content keeps the data URI for
   *  preview); defaults to content for every other file type. */
  sendContent?: string;
  /** Whether this file has been sent with the last message. */
  sent: boolean;
};

/**
 * Payload carried from "Crear listado de pre-prompts" to the parent once the
 * user confirms the creation summary modal — the parent selects the first
 * scene + first shot and starts the studio session.
 */
interface PendingShotsSaved {
  projectId: string;
  chapterId: string;
  sceneId: string;
  firstSceneNumber: number;
  firstSceneName: string;
  firstShotId: string;
  firstShotNumber: number;
  firstShotName: string;
  firstShotDescription: string;
}

/** One scene of the creation-summary modal (scenes + shots created). */
interface CreationSceneSummary {
  scriptNumber: number;
  scriptLocation: string;
  /** Whether the scene had to be created (false = already existed). */
  created: boolean;
  /** Numbers of the shots created under this scene. */
  shotNumbers: number[];
}

/** Minimal file shape the full-screen AssetViewerComponent accepts. */
interface ViewerFile {
  id: string;
  filename?: string;
  mimeType?: string;
}

/** Metadata shown in the episode-asset popover when a character or free asset
 *  is clicked. The union discriminates character vs. free-asset rows. */
type AssetInfo =
  | {
      kind: 'character';
      name: string;
      charId: string;
      fileId: string;
      slot: string;
      fileKind: string;
    }
  | { kind: 'asset'; filename: string; fileId: string; slot: string; fileKind: string };

@Component({
  selector: 'app-shot-builder-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SplitterModule,
    FileUploadModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    Popover,
    ShotSequenceViewerComponent,
    ShotBuilderSettingsDialogComponent,
    AssetViewerComponent,
    DialogModule,
    SourceThumbnailAssetPipe,
    ProgressSpinnerModule,
    SourceAssetPipe,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shot-builder-panel.component.html',
  styleUrls: ['./shot-builder-panel.component.css'],
  providers: [MessageService],
})
export class ShotBuilderPanelComponent implements OnInit {
  constructor() {
    this.validateClaudeModel();
    // Load the library's assetType map eagerly so the episode resource tabs
    // (characters/locations/props/audio) are grouped correctly from the start.
    this.ensureCharacterTypes();
  }

  /** Check that a text-type model named 'claude-shot-builder' exists and is active. */
  private validateClaudeModel(): void {
    this.modelService.getAllModels('text').subscribe((res) => {
      this.modelCheckDone.set(true);
      if (res.error || !res.data) {
        return;
      }
      const target = res.data.find((m) => m.name === 'claude-shot-builder');
      if (!target) {
        this.modelMissing.set(true);
        this.modelWarningVisible.set(true);
      } else if (!target.active) {
        this.modelMissing.set(true);
        this.modelWarningVisible.set(true);
      }
    });
  }

  /** Optional: allow parent to pass project/scene IDs directly.
   *  Falls back to StudioStore values if not provided. */
  readonly sceneId = input<string | null>(null);
  readonly projectId = input<string | null>(null);
  readonly chapterId = input<string | null>(null);
  /** Names for the shot-sequence-viewer header, sourced from the breadcrumb. */
  readonly projectName = input<string>('');
  readonly chapterName = input<string>('');
  readonly sceneName = input<string>('');

  protected readonly studio = inject(StudioStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly shotBuilderService = inject(ShotBuilderService);
  private readonly studioApiService = inject(StudioApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly filesApi = inject(FilesApiService);
  private readonly charsApi = inject(CharactersApiService);
  private readonly modelService = inject(ModelService);
  private readonly i18n = inject(TranslateService);
  private readonly toast = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly promptText = signal('');
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly uploadedFiles = signal<UploadedFile[]>([]);
  readonly activeFileId = signal<string | null>(null);

  readonly isProduction = environment.production || this.sessionStore.roleLevel() > LEVEL_ROL.ADMIN; // TODO: remove this
  readonly restoring = input(false);

  /** True while free assets are being uploaded (persisted to the episode). */
  readonly uploadingAssets = signal(false);

  /** Episode asset whose metadata is shown in the click popover. */
  protected readonly assetInfo = signal<AssetInfo | null>(null);
  /** characterId → assetType, resolved lazily from the full character list so
   *  the popover can show whether a character is character/location/prop/audio. */
  private readonly characterTypes = signal<Map<string, AssetType>>(new Map());
  private charactersLoaded = false;
  @ViewChild('assetPopover') protected readonly assetPopover!: Popover;

  /** Full-screen file viewer (same component as the Files module). */
  protected readonly viewerFile = signal<ViewerFile | null>(null);
  protected readonly viewerVisible = signal(false);

  /** Episode-level data (title, totalDuration, assetAssignments). */
  readonly episodeData = signal<EpisodeData | null>(null);
  /** Parsed scenes with their shots from Claude. */
  readonly scenes = signal<SceneData[]>([]);
  /** Flattened shot list from all scenes (legacy compat). */
  readonly shots = signal<ShotBuilderShot[]>([]);
  /** Total shot count across all scenes. */
  readonly totalShots = computed(() => this.scenes().reduce((sum, s) => sum + s.shots.length, 0));
  /** The raw text response for display. */
  readonly rawResponse = signal<string>('');

  /** Change request applied by the last refine — shown as a banner in the
   *  Sequence Viewer so it is clear the result came from a refine. */
  readonly lastRefineInfo = signal<{ changeRequest: string } | null>(null);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** True after the claude-shot-builder model check completes. */
  readonly modelCheckDone = signal(false);
  /** True when the claude-shot-builder model was NOT found. */
  readonly modelMissing = signal(false);
  /** Dialog visibility for the missing model warning. */
  protected readonly modelWarningVisible = signal(false);

  /** Typed Sequence data for the native Angular viewer. */
  readonly sequenceData = signal<Sequence | null>(null);

  /** True when there's Sequence data to show in the native viewer. */
  readonly hasSequenceData = computed(() => this.sequenceData() !== null);

  /** Full-screen mode toggle for the right preview panel. */
  readonly fullscreen = signal(false);
  /** Full-screen mode toggle for the left editor panel. Only one panel can be
   *  fullscreen at a time, so entering either exits the other. */
  protected readonly leftFullscreen = signal(false);
  protected readonly toggleFullscreen = () => {
    this.leftFullscreen.set(false);
    this.fullscreen.update((v) => !v);
  };
  protected readonly toggleLeftFullscreen = () => {
    this.fullscreen.set(false);
    this.leftFullscreen.update((v) => !v);
  };

  // ── Skill & Model selection ────────────────────────────────────

  protected readonly settingsDialogVisible = signal(false);
  protected readonly skillDialogVisible = signal(false);

  /** Claude model for the shot builder — independent from studio video model. */
  private readonly claudeModelName = signal<string>(CLAUDE_MODELS[0].name);
  /** Whether to generate Chinese prompts (prompt.zh). */
  protected readonly generateChinese = signal(false);

  protected readonly selectedModelName = computed(() => this.claudeModelName());

  protected onClaudeModelSelected(name: string): void {
    this.claudeModelName.set(name);
  }

  protected onGenerateChineseChange(enabled: boolean): void {
    this.generateChinese.set(enabled);
  }

  /** Index of the currently active file tab. -1 means "Preview" (artifact) tab. */
  readonly activeFileIndex = computed(() => {
    const id = this.activeFileId();
    if (id === null) return -1;
    return this.uploadedFiles().findIndex((f) => f.name === id);
  });

  readonly fileContent = computed(() => {
    const idx = this.activeFileIndex();
    const files = this.uploadedFiles();
    if (idx < 0 || idx >= files.length) return '';
    return files[idx].content;
  });

  readonly selectedFileName = computed(() => {
    const idx = this.activeFileIndex();
    const files = this.uploadedFiles();
    if (idx < 0 || idx >= files.length) return '';
    return files[idx].name;
  });

  readonly activeFileMimeType = computed(() => {
    const idx = this.activeFileIndex();
    const files = this.uploadedFiles();
    if (idx < 0 || idx >= files.length) return '';
    return files[idx].mimeType || '';
  });

  readonly isImagePreview = computed(() => this.activeFileMimeType().startsWith('image/'));
  readonly isPdfPreview = computed(() => this.activeFileMimeType() === 'application/pdf');
  readonly isHtmlPreview = computed(() => this.activeFileMimeType() === 'text/html');
  readonly isDocPreview = computed(() =>
    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ].includes(this.activeFileMimeType()),
  );
  readonly isXlsxPreview = computed(() =>
    [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ].includes(this.activeFileMimeType()),
  );
  readonly isOfficePreview = computed(() => this.isDocPreview() || this.isXlsxPreview());
  /** The parsed text representation of an Office document. */
  readonly officeText = computed(() => {
    const idx = this.activeFileIndex();
    const files = this.uploadedFiles();
    if (idx < 0 || idx >= files.length) return '';
    return files[idx].content; // already decoded during upload
  });

  /** Safe PDF URL for use in [src] binding (data URIs are blocked by Angular security). */
  readonly safePdfUrl = computed<SafeResourceUrl | null>(() => {
    if (!this.isPdfPreview()) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.fileContent());
  });

  readonly canSend = computed(
    () => !this.loading() && Boolean(this.promptText().trim() || this.uploadedFiles().length > 0),
  );

  /** True when there is a previous generate-shots response to refine. */
  readonly hasPreviousResponse = computed(() => this.rawResponse().length > 0);

  /** Text of the refine (change request) input. */
  readonly refineText = signal('');
  /** Whether the refine box is expanded. */
  readonly refineExpanded = signal(false);

  /** Chat container, scrolled to the latest message on each turn. */
  @ViewChild('chatScroll') private readonly chatScrollEl?: { nativeElement: HTMLElement };
  /** Auto-scroll the chat to the newest message when the thread grows. */
  private readonly chatAutoScroll = effect(() => {
    this.chatMessages();
    queueMicrotask(() => {
      const el = this.chatScrollEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  });

  /** The shot currently being refined from its inline chat card. */
  readonly targetRefine = signal<ShotRefineTarget | null>(null);
  /** Instruction for the targeted refine (dialog). */
  readonly refineShotText = signal('');
  /** Whether the per-shot refine dialog is open. */
  readonly refineShotVisible = signal(false);

  readonly canRefine = computed(
    () => !this.loading() && this.hasPreviousResponse() && this.refineText().trim().length > 0,
  );

  /** Segments for the time budget bar: each scene as a colored segment. */
  readonly timeBudgetBar = computed(() => {
    const sc = this.scenes();
    const total = sc.reduce((sum, s) => sum + s.duration, 0) || 1; // avoid div by 0
    return sc.map((s) => {
      const pct = (s.duration / total) * 100;
      // Color by scene type
      const color =
        s.sceneType === 'flashback'
          ? '#f59e0b' // amber
          : s.sceneType === 'fantasy' || s.sceneType === 'dream'
            ? '#8b5cf6' // violet
            : '#14b8a6'; // teal (present)
      return {
        scriptNumber: s.scriptNumber,
        scriptLocation: s.scriptLocation,
        duration: s.duration,
        pct,
        color,
        shotCount: s.shots.length,
      };
    });
  });

  /** True when the "Preview" tab (artifact / shot list) is selected. */
  readonly isPreviewTab = computed(() => this.activeFileId() === null);

  /** True when there are parsed scenes/shots to show. */
  readonly hasShots = computed(() => this.scenes().length > 0);

  /** Super Admin check (roleLevel === 0). */
  protected readonly isSuperAdmin = computed(() => this.sessionStore.roleLevel() === 0);

  /** Dialog visibility for the preview modal (JSON dump of current data). */
  protected readonly previewDialogVisible = signal(false);

  /** Parsed shot-builder data (episode + scenes) as a plain object — shared by
   *  the preview modal and the JSON download so both show the same payload. */
  private previewDataObject(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};
    const ep = this.episodeData();
    if (ep) snapshot['episode'] = ep;
    const sc = this.scenes();
    if (sc.length > 0) snapshot['scenes'] = sc;
    const raw = this.rawResponse();
    if (raw) snapshot['rawLength'] = raw.length;
    return snapshot;
  }

  /** True when there's episode/scene data to preview or download. */
  protected readonly hasPreviewData = computed(
    () => Object.keys(this.previewDataObject()).length > 0,
  );

  /** Pretty-printed JSON of the current episode + scenes data for the preview modal. */
  protected readonly previewDataPretty = computed(() => {
    const snapshot = this.previewDataObject();
    if (Object.keys(snapshot).length === 0) return 'No data available. Generate shots first.';
    return JSON.stringify(snapshot, null, 2);
  });

  /** Download the parsed response as a JSON file named "Shot Builder" + timestamp. */
  protected downloadPreviewData(): void {
    const snapshot = this.previewDataObject();
    if (Object.keys(snapshot).length === 0) return;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Shot Builder ${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.toast.add({
      severity: 'success',
      summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_DOWNLOADED'),
    });
  }

  // ── Episode Assets preview ─────────────────────────────────────────

  /** Collapsed/expanded state for the episode assets section. */
  protected readonly episodeAssetsExpanded = signal(true);

  /** Chapter characters sorted by their [ImageN] slot number (slot-less last). */
  protected readonly sortedChapterCharacters = computed(() => {
    return [...this.studio.chapterCharacterData()].sort(
      (a, b) => slotNum(a.slot) - slotNum(b.slot),
    );
  });

  /** Episode assets sorted by their [ImageN] slot number (slot-less last). */
  protected readonly sortedFreeAssets = computed(() => {
    const slotOf = (id: string) => slotNum(this.studio.chapterAssetSlots().get(id) ?? '');
    return [...this.studio.freeAssets()].sort((a, b) => slotOf(a.id) - slotOf(b.id));
  });

  // ── Resource tabs (characters / locations / props / audio / free) ───

  /** Active resource tab in the episode assets preview. */
  protected readonly activeAssetTab = signal<AssetType | 'free'>('character');

  /** Resource tabs — the semantic types come from the library's assetType
   *  metadata; 'free' shows untagged episode uploads. */
  protected readonly assetTabs: (AssetType | 'free')[] = [
    'character',
    'location',
    'prop',
    'audio',
    'free',
  ];

  /** i18n label for each resource tab. */
  protected readonly assetTabLabel: Record<string, string> = {
    character: 'STUDIO.SHOT_BUILDER.TAB_CHARACTERS',
    location: 'STUDIO.SHOT_BUILDER.TAB_LOCATIONS',
    prop: 'STUDIO.SHOT_BUILDER.TAB_PROPS',
    audio: 'STUDIO.SHOT_BUILDER.TAB_AUDIO',
    free: 'STUDIO.SHOT_BUILDER.TAB_FREE',
  };

  /** assetType of a chapter character row — from the library metadata,
   *  defaulting to 'character' so untagged rows still land somewhere. */
  protected assetTypeOf(c: { id: string }): AssetType {
    return this.characterTypes().get(c.id) ?? 'character';
  }

  /** Chapter characters for the active typed tab (empty for the free tab). */
  protected readonly tabCharacters = computed(() => {
    const tab = this.activeAssetTab();
    if (tab === 'free') return [];
    return this.sortedChapterCharacters().filter((c) => this.assetTypeOf(c) === tab);
  });

  /** Item count badge for a tab: typed characters for the semantic tabs,
   *  free-asset count for the free tab. */
  protected assetTabCount(tab: AssetType | 'free'): number {
    if (tab === 'free') return this.sortedFreeAssets().length;
    return this.sortedChapterCharacters().filter((c) => this.assetTypeOf(c) === tab).length;
  }

  /** Navigate to the Providers section so the user can create the missing model. */
  protected onGoToProviders(): void {
    this.modelWarningVisible.set(false);
    window.location.href = '/providers';
  }

  /** True when scene assignments have been loaded at least once. */
  protected readonly assignmentsLoaded = computed(() => this.studio.assignmentsLoaded());

  /** IDs of thumbnails that failed to load. */
  private readonly brokenThumbs = signal<Set<string>>(new Set());

  ngOnInit(): void {}

  protected isThumbBroken(id: string): boolean {
    return this.brokenThumbs().has(id);
  }

  protected onThumbError(id: string): void {
    this.brokenThumbs.update((s) => {
      const next = new Set(s);
      next.add(id);
      return next;
    });
  }

  /** Tooltip label for an episode asset: its [ImageN] slot when assigned, else
   *  the filename. */
  protected chapterAssetSlotLabel(id: string, filename: string): string {
    return this.studio.chapterAssetSlots().get(id) || filename;
  }

  /** Open the metadata popover for a chapter character chip. */
  protected onCharacterInfo(
    event: Event,
    c: { id: string; name: string; slot: string; fileId: string; kind: string },
  ): void {
    this.ensureCharacterTypes();
    this.assetInfo.set({
      kind: 'character',
      name: c.name,
      charId: c.id,
      fileId: c.fileId,
      slot: c.slot || this.studio.chapterAssetSlots().get(c.fileId) || '',
      fileKind: c.kind,
    });
    this.assetPopover.toggle(event);
  }

  /** Load the character→assetType map once, lazily, from the full library. */
  private ensureCharacterTypes(): void {
    if (this.charactersLoaded) return;
    this.charactersLoaded = true;
    this.charsApi.list().subscribe((res) => {
      if (res.error || !res.data) return;
      const map = new Map<string, AssetType>();
      for (const item of res.data) {
        let metadata: CharacterMetadata = {};
        try {
          metadata = item.character.metadata ? JSON.parse(item.character.metadata) : {};
        } catch {
          metadata = {};
        }
        map.set(item.character.id, (metadata.assetType ?? 'character') as AssetType);
      }
      this.characterTypes.set(map);
    });
  }

  /** The asset type (character/location/prop/audio) of the character shown in
   *  the popover — derived from the library, falling back to 'character'. */
  protected readonly assetInfoType = computed<AssetType>(() => {
    const info = this.assetInfo();
    if (!info || info.kind !== 'character') return 'character';
    return this.characterTypes().get(info.charId) ?? 'character';
  });

  /** Open the metadata popover for a free asset thumbnail. */
  protected onAssetInfo(event: Event, a: ReferenceAsset): void {
    this.assetInfo.set({
      kind: 'asset',
      filename: a.filename,
      fileId: a.id,
      slot: this.studio.chapterAssetSlots().get(a.id) || '',
      fileKind: a.kind,
    });
    this.assetPopover.toggle(event);
  }

  // ── Scene reference info popover (metadata of the resolved asset) ───────

  /** Reference shown in the scene-reference metadata popover. */
  protected readonly refInfoTarget = signal<Reference | null>(null);
  @ViewChild('refInfoPopover') protected readonly refInfoPopover!: Popover;

  /** Human label for a reference's semantic type. */
  protected refTypeLabel(type: string): string {
    switch (type) {
      case 'character':
        return this.i18n.instant('STUDIO.SHOT_BUILDER.REF_TYPE_CHARACTER');
      case 'location':
        return this.i18n.instant('STUDIO.SHOT_BUILDER.REF_TYPE_LOCATION');
      case 'prop':
        return this.i18n.instant('STUDIO.SHOT_BUILDER.REF_TYPE_PROP');
      default:
        return type;
    }
  }

  /** Resolve a scene reference's assetId to a chapter character or free asset
   *  (matched by id, file id, name/filename — case-insensitive), or null when
   *  it doesn't match anything in the episode. */
  protected refInfoOf(ref: Reference): ResolvedRefInfo | null {
    return resolveReferenceInfo(
      ref,
      this.studio.chapterCharacterData(),
      this.studio.freeAssets(),
      this.studio.chapterAssetSlots(),
    );
  }

  /** Open the metadata popover for a scene reference chip. */
  protected openSceneRefInfo(event: Event, ref: Reference): void {
    this.refInfoTarget.set(ref);
    this.refInfoPopover.toggle(event);
  }

  /** Unassign a free asset from the episode (backend + store), then close. */
  protected onRemoveFreeAsset(): void {
    const info = this.assetInfo();
    if (!info || info.kind !== 'asset') return;

    const projectId = this.projectId() || this.studio.projectId();
    const chapterId = this.chapterId() || this.studio.chapterId();
    const assignmentId = this.studio.chapterAssetAssignmentIds().get(info.fileId);

    const close = (): void => {
      this.assetPopover.hide();
      this.assetInfo.set(null);
    };

    if (!projectId || !chapterId || !assignmentId) {
      // Nothing persisted (or no assignment id yet) — just drop it locally.
      this.studio.removeChapterAsset(info.fileId);
      close();
      return;
    }

    this.projectsApi.removeAssetFromChapter(projectId, chapterId, assignmentId).subscribe({
      next: (res) => {
        if (res.error) {
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_REMOVE_FAILED'),
            detail: res.msg,
          });
          return;
        }
        this.studio.removeChapterAsset(info.fileId);
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSET_REMOVED'),
          detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSET_REMOVED_DETAIL', {
            name: info.filename,
          }),
        });
      },
      error: () => {
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_REMOVE_FAILED'),
          detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_REMOVE_FAILED_DETAIL'),
        });
      },
      complete: close,
    });
  }

  /** Open the full-screen viewer for the asset currently shown in the popover.
   *  Uses the same AssetViewerComponent as the Files module. */
  protected openAssetViewer(): void {
    const info = this.assetInfo();
    if (!info || !info.fileId) return;
    this.viewerFile.set({
      id: info.fileId,
      filename: info.kind === 'character' ? info.name : info.filename,
      mimeType:
        info.fileKind === 'video'
          ? 'video/mp4'
          : info.fileKind === 'audio'
            ? 'audio/mpeg'
            : 'image/png',
    });
    this.viewerVisible.set(true);
  }

  /** True while saving shots to the backend. */
  readonly savingShots = signal(false);

  /** Summary of the last batch created by "Crear listado de pre-prompts". */
  protected readonly creationSummary = signal<{
    scenes: CreationSceneSummary[];
    shotsCreated: number;
    errors: string[];
  } | null>(null);
  /** Dialog visibility for the creation-summary modal. */
  protected readonly creationSummaryVisible = signal(false);

  /** Pending navigation payload — emitted when the summary modal is confirmed. */
  private pendingShotsSaved: PendingShotsSaved | null = null;

  /** Confirmation dialog before saving multi-scene. */
  readonly confirmDialogVisible = signal(false);
  /** Summary data for the confirmation dialog. */
  readonly confirmData = computed(() => {
    const sc = this.scenes();
    let totalShots = 0;
    const sceneLines: string[] = [];
    for (const s of sc) {
      totalShots += s.shots.length;
      sceneLines.push(
        `    - ${this.i18n.instant('STUDIO.SHOT_BUILDER.CONFIRM_SCENE_LINE', {
          number: s.scriptNumber,
          location: s.scriptLocation,
          shots: s.shots.length,
        })}`,
      );
    }
    return { sceneCount: sc.length, totalShots, sceneLines };
  });

  /**
   * Emitted after all generated shots are saved to the backend and the user
   * confirms the creation-summary modal. The parent (IndexStudio) selects the
   * first scene + first shot and starts the studio session with its pre-prompt.
   */
  readonly shotsSaved = output<PendingShotsSaved>();

  /** Structured artifact HTML generated from Claude's JSON response. */
  readonly artifactHtml = computed<string | null>(() => {
    const raw = this.rawResponse();
    if (!raw) return null;

    const data = parseArtifactData(raw);
    CONSOLE.log(
      '[artifact] raw preview:',
      raw.slice(0, 200),
      'parsed:',
      !!data,
      'shots:',
      data?.shots?.length,
    );
    if (data && data.shots && data.shots.length > 0) {
      return generateArtifactHtml(data);
    }

    // Fallback: display as plain text
    return `<pre style="white-space:pre-wrap;font-family:monospace;font-size:13px;background:#0a1011;color:#d3d8d4;padding:16px;border-radius:4px;">${this.escapeHtml(raw)}</pre>`;
  });

  /** SafeResourceUrl for iframe [src] — avoids Angular HTML sanitization stripping content. */
  readonly safeArtifactUrl = computed<SafeResourceUrl | null>(() => {
    const html = this.artifactHtml();
    if (!html) return null;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── File management ────────────────────────────────────────────────

  selectFile(indexOrNull: number): void {
    if (indexOrNull < 0) {
      this.activeFileId.set(null);
      return;
    }
    const files = this.uploadedFiles();
    if (indexOrNull >= 0 && indexOrNull < files.length) {
      this.activeFileId.set(files[indexOrNull].name);
    }
  }

  onSelectedFiles(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const files = target?.files ? Array.from(target.files) : [];
    if (files.length === 0) return;

    let processed = 0;
    const initialLength = this.uploadedFiles().length;

    files.forEach((file) => {
      const mimeType = file.type || 'application/octet-stream';
      const isPdf = mimeType === 'application/pdf';
      const isOfficeDoc =
        mimeType.includes('openxmlformats-officedocument.wordprocessingml') ||
        mimeType.includes('openxmlformats-officedocument.spreadsheetml') ||
        mimeType.includes('msword') ||
        mimeType.includes('ms-excel');
      const reader = new FileReader();

      reader.onload = async () => {
        let content = typeof reader.result === 'string' ? reader.result : '';
        let sendContent: string | undefined;

        // Parse PDFs into readable text — Claude can't read a raw base64
        // blob, so the extracted script text is what gets sent. `content`
        // always keeps the data URI so the preview iframe keeps working.
        if (isPdf && reader.result instanceof ArrayBuffer) {
          content = this.bufferToDataUrl(reader.result, mimeType);
          try {
            sendContent = await this.extractPdfText(reader.result);
          } catch (err) {
            CONSOLE.error('[pdf] failed to extract text from', file.name, err);
            sendContent = `[Unable to parse ${file.name}. The PDF could not be read as text.]`;
          }
        }

        // Parse Office documents into readable text
        if (isOfficeDoc && reader.result instanceof ArrayBuffer) {
          try {
            if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
              const result = await mammoth.extractRawText({ arrayBuffer: reader.result });
              content = result.value;
            } else {
              const workbook = XLSX.read(reader.result, { type: 'array' });
              const parts: string[] = [];
              workbook.SheetNames.forEach((name) => {
                const sheet = workbook.Sheets[name];
                const csv = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' });
                parts.push(`[Sheet: ${name}]`);
                parts.push(csv);
              });
              content = parts.join('\n\n');
            }
          } catch {
            content = `[Unable to parse ${file.name}. The file could not be read as text.]`;
          }
        }

        this.uploadedFiles.update((items) => [
          ...items,
          { name: file.name, content, sendContent, mimeType, sent: false },
        ]);

        processed += 1;
        if (processed === files.length) {
          if (this.activeFileId() === null) {
            const firstNewIndex = initialLength;
            const filesNow = this.uploadedFiles();
            if (filesNow.length > 0) {
              this.selectFile(Math.min(firstNewIndex, filesNow.length - 1));
            }
          }
        }
      };

      reader.onerror = () => {
        this.error.set(this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_READ_FILE_FAILED'));
      };

      if (isPdf) {
        // Read as ArrayBuffer so the text can be extracted (data URI is
        // rebuilt from the buffer for the preview).
        reader.readAsArrayBuffer(file);
      } else if (mimeType.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else if (isOfficeDoc) {
        // Read as ArrayBuffer so mammoth/xlsx can parse
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  /**
   * Upload image/video/audio files as episode "free assets": each file is
   * uploaded to the backend, added to the store's freeAssets (so it shows in
   * the "Episode Assets" panel and is sent to Claude as a reference asset),
   * and assigned to the chapter so it persists across reloads.
   */
  onFreeAssetsSelected(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const files = target?.files ? Array.from(target.files) : [];
    if (files.length === 0) return;

    const projectId = this.projectId() || this.studio.projectId();
    const chapterId = this.chapterId() || this.studio.chapterId();

    let pending = files.length;
    let assignedAny = false;
    this.uploadingAssets.set(true);

    // Called once per file after its chapter assignment settles (or when it
    // never had one). Once every file is done, reload the chapter assignments
    // so the auto-assigned @imageN slots the backend just stored show up
    // immediately — without the user having to reload the page.
    const done = (): void => {
      pending -= 1;
      if (pending <= 0) {
        this.uploadingAssets.set(false);
        if (assignedAny && projectId && chapterId) {
          this.projectsApi.getChapterAssignments(projectId, chapterId).subscribe((res) => {
            if (!res.error && res.data) this.studio.setChapterAssignments(res.data);
          });
        }
      }
    };

    for (const f of files) {
      let category: FileCategory;
      if (f.type.startsWith('image/')) {
        category = 'images';
      } else if (f.type.startsWith('video/')) {
        category = 'videos';
      } else if (f.type.startsWith('audio/')) {
        category = 'audio';
      } else {
        this.toast.add({
          severity: 'warn',
          summary: this.i18n.instant('STUDIO.ASSETS.TOAST_UNSUPPORTED'),
          detail: this.i18n.instant('STUDIO.ASSETS.TOAST_UNSUPPORTED_DETAIL'),
        });
        done();
        continue;
      }

      this.filesApi.upload({ file: f, category, storage: 'persistent' }).subscribe({
        next: (up) => {
          if (up.error || !up.data) {
            this.toast.add({
              severity: 'error',
              summary: this.i18n.instant('STUDIO.ASSETS.TOAST_UPLOAD_ERROR'),
              detail: up.msg,
            });
            done();
            return;
          }
          const fileId = up.data.id;
          this.studio.addFreeAsset({
            id: fileId,
            kind: inferKind(f),
            filename: up.data.filename,
            thumbnailUrl: this.filesApi.serveUrl(fileId),
            tag: '',
            slot: 'free',
          });
          this.toast.add({
            severity: 'success',
            summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSET_ADDED_FREE'),
            detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_ASSET_ADDED_FREE_DETAIL', {
              name: f.name,
            }),
          });
          // Persist as an episode asset so it survives chapter changes/reloads.
          // The returned chapter_assets row id lets the user remove it right
          // away without waiting for a reload.
          if (projectId && chapterId) {
            this.projectsApi.assignAssetToChapter(projectId, chapterId, fileId).subscribe({
              next: (res) => {
                if (res?.data?.id) {
                  this.studio.registerChapterAssetAssignment(fileId, res.data.id);
                  assignedAny = true;
                }
              },
              error: () => done(),
              complete: () => done(),
            });
          } else {
            done();
          }
        },
        error: () => {
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('STUDIO.ASSETS.TOAST_UPLOAD_ERROR'),
            detail: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_UPLOAD_FAILED', {
              name: f.name,
            }),
          });
          done();
        },
      });
    }

    // Allow selecting the same file again.
    if (target) target.value = '';
  }

  /** Extract plain text from a PDF using pdfjs-dist. */
  private async extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
    const task = getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await task.promise;
    try {
      const parts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // pdfjs returns one text item per word/run. Rebuild the visual line
        // structure from each item's baseline Y (transform[5]) and its
        // end-of-line flag (hasEOL) — joining everything with a single space
        // flattens the screenplay into one giant line and destroys the
        // scene-header/dialogue/action layout.
        const lines: string[] = [];
        let currentLine: string[] = [];
        let lastY: number | null = null;
        for (const item of textContent.items) {
          if (!('str' in item) || item.str === '') continue;
          const y = item.transform[5];

          // Baseline jumped → the next word starts a new visual line.
          if (lastY !== null && Math.abs(y - lastY) > 2 && currentLine.length > 0) {
            lines.push(currentLine.join(' '));
            currentLine = [];
          }

          currentLine.push(item.str);
          lastY = y;

          // pdfjs marks the last item of each line explicitly — catches
          // same-baseline breaks (columns, table cells).
          if (item.hasEOL && currentLine.length > 0) {
            lines.push(currentLine.join(' '));
            currentLine = [];
          }
        }
        if (currentLine.length > 0) {
          lines.push(currentLine.join(' '));
        }

        parts.push(`\n${lines.join('\n').trim()}`);
        page.cleanup();
      }
      return parts.join('\n\n');
    } finally {
      await task.destroy();
    }
  }

  /** Convert an ArrayBuffer into a data URL (used to rebuild the PDF preview
   *  after reading the file as an ArrayBuffer). */
  private bufferToDataUrl(arrayBuffer: ArrayBuffer, mimeType: string): string {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return `data:${mimeType};base64,${btoa(binary)}`;
  }

  onRemoveFile(index: number): void {
    const updated = this.uploadedFiles().filter((_, i) => i !== index);
    this.uploadedFiles.set(updated);

    if (updated.length === 0) {
      this.activeFileId.set(null);
    } else {
      let nextIndex = this.activeFileIndex();
      if (nextIndex >= updated.length) nextIndex = updated.length - 1;
      if (nextIndex < 0) nextIndex = 0;
      this.selectFile(nextIndex);
    }
  }

  // ── Chat & generation ──────────────────────────────────────────────

  send(): void {
    // Second+ turn in the chat refines the existing breakdown instead of
    // regenerating from scratch — anchors on the previous response so only
    // the requested changes are applied (anti-drift). Click "Clear" to
    // generate a fresh breakdown from a new script.
    const isRefine = this.hasPreviousResponse();

    // For a refine, the previous breakdown IS the context: the change request
    // is just the typed instruction (+ any NEW files, never the ones already
    // sent to generate-shots — their content is already interpreted inside the
    // previous response).
    const content = isRefine ? this.getRefineContent() : this.getSendContent();
    if (!content) return;

    // Add user message to chat
    this.chatMessages.update((items) => [
      ...items,
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        ...(isRefine ? { kind: 'refine' as const } : {}),
        content,
        timestamp: Date.now(),
      },
    ]);

    // Mark files as sent
    this.uploadedFiles.update((items) => items.map((f) => ({ ...f, sent: true })));

    // Switch to Preview tab so the artifact is visible
    this.activeFileId.set(null);

    if (isRefine) {
      this.runRefine(content, false);
      return;
    }

    CONSOLE.log('PROMPT:', { content });

    this.loading.set(true);
    this.error.set(null);
    this.shots.set([]);
    this.rawResponse.set('');
    this.sequenceData.set(null);
    this.lastRefineInfo.set(null);

    const userName = this.sessionStore.user()?.handle || '';
    const selectedSkill = this.studio.selectedSkill();

    // Build scene context from the store for richer generation:
    // characters (with portrait file id + slot) + free assets (image/video/
    // audio). The backend resolves image ids to public vision URLs so Claude
    // can analyze the actual reference images.
    const sceneContext = this.buildSceneContext();

    this.shotBuilderService
      .generate({
        projectId: this.projectId() || this.studio.projectId() || '',
        projectName: this.studio.projectName(),
        // The shot builder generates at episode level — no scene is required.
        // The backend still validates scene_id (binding:required) but never
        // uses it, so fall back to the chapter id when no scene is selected.
        sceneId:
          this.sceneId() ||
          this.studio.sceneId() ||
          this.chapterId() ||
          this.studio.chapterId() ||
          '',
        prompt: content,
        systemPrompt: SHOT_BUILDER_SYSTEM_PROMPT,
        model: this.claudeModelName(),
        skillID: selectedSkill?.id || undefined,
        userName,
        generateZh: this.generateChinese(),
        sceneContext,
      })
      .subscribe({
        next: (result: ShotBuilderResult) => {
          this.episodeData.set(result.episode || null);
          this.scenes.set(result.scenes);
          this.rawResponse.set(result.rawText);

          // Render the SEEDANCE-style native viewer from the real response.
          // Falls back to null (artifact / raw text path) when there are no shots.
          const seq = shotBuilderResultToSequence(result, this.studio.output().aspectRatio);
          this.sequenceData.set(seq ? computeCharacterCount(seq) : null);

          // Flatten all shots from all scenes for legacy compat
          const allShots: ShotBuilderShot[] = [];
          for (const scene of result.scenes) {
            for (const shot of scene.shots) {
              allShots.push(shot);
            }
          }
          this.shots.set(allShots);

          // Add assistant message to chat
          const sceneCount = result.scenes.length;
          const totalShots = allShots.length;
          const epTitle = result.episode?.title || '';
          const epPrefix = epTitle ? ` ${epTitle} —` : '';
          const hasRaw = result.rawText.length > 0;
          const summary =
            totalShots > 0
              ? this.i18n.instant('STUDIO.SHOT_BUILDER.CHAT_GENERATED', {
                  ep: epPrefix,
                  scenes: sceneCount,
                  shots: totalShots,
                })
              : hasRaw
                ? this.i18n.instant('STUDIO.SHOT_BUILDER.CHAT_GENERATED_RAW')
                : this.i18n.instant('STUDIO.SHOT_BUILDER.CHAT_GENERATED_EMPTY');
          this.chatMessages.update((items) => [
            ...items,
            {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              role: 'assistant',
              kind: 'generate',
              content: summary,
              timestamp: Date.now(),
              result,
            },
          ]);
        },
        error: (err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : this.i18n.instant('STUDIO.SHOT_BUILDER.CHAT_GEN_FAILED');
          this.error.set(message);
          this.loading.set(false);
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TITLE'),
            detail: message,
            life: 6000,
          });
        },
        complete: () => {
          this.loading.set(false);
        },
      });
  }

  /** Refine from the "Refine breakdown" box: sends the typed change request
   *  and applies it to the last generate-shots response (anti-drift). */
  refine(): void {
    const changeRequest = this.refineText().trim();
    if (!changeRequest || !this.hasPreviousResponse()) return;
    this.runRefine(changeRequest, true);
  }

  /** Shared refine pipeline used by both the "Refine breakdown" box and the
   *  main send() when a previous response already exists. addChatMessage is
   *  false when called from send(), which already appended the user message.
   *  targets scopes the refine to specific shots (per-shot refine). */
  private runRefine(
    changeRequest: string,
    addChatMessage: boolean,
    targets?: ShotRefineTarget[],
  ): void {
    const previousResponse = this.rawResponse();
    if (!previousResponse) return;

    // When scoped to shots, make the scoping explicit in the instruction text
    // too (belt and suspenders with the structured targets field).
    const targetLabel = targets?.length ? this.targetLabel(targets) : '';
    const scopedRequest = targetLabel
      ? `Modificá SOLO el shot ${targetLabel}: ${changeRequest}`
      : changeRequest;

    if (addChatMessage) {
      this.chatMessages.update((items) => [
        ...items,
        {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          role: 'user',
          kind: 'refine',
          content: scopedRequest,
          timestamp: Date.now(),
          ...(targets?.length ? { targets } : {}),
        },
      ]);
    }

    this.loading.set(true);
    this.error.set(null);

    const userName = this.sessionStore.user()?.handle || '';
    const selectedSkill = this.studio.selectedSkill();

    this.shotBuilderService
      .refineShots({
        projectId: this.projectId() || this.studio.projectId() || '',
        projectName: this.studio.projectName(),
        // Same scene fallback as send(): the backend validates scene_id but
        // the breakdown is generated at episode level.
        sceneId:
          this.sceneId() ||
          this.studio.sceneId() ||
          this.chapterId() ||
          this.studio.chapterId() ||
          '',
        previousResponse,
        changeRequest: scopedRequest,
        model: this.claudeModelName(),
        skillID: selectedSkill?.id || undefined,
        sceneContext: this.buildSceneContext(),
        userName,
        generateZh: this.generateChinese(),
        ...(targets?.length ? { targets } : {}),
        recentContext: this.recentContext(),
      })
      .subscribe({
        next: (result: ShotBuilderResult) => {
          this.episodeData.set(result.episode || null);
          this.scenes.set(result.scenes);
          this.rawResponse.set(result.rawText);

          // Re-render the native viewer from the refined response.
          const seq = shotBuilderResultToSequence(result, this.studio.output().aspectRatio);
          this.sequenceData.set(seq ? computeCharacterCount(seq) : null);

          // Flatten all shots from all scenes for legacy compat.
          const allShots: ShotBuilderShot[] = [];
          for (const scene of result.scenes) {
            for (const shot of scene.shots) {
              allShots.push(shot);
            }
          }
          this.shots.set(allShots);

          const sceneCount = result.scenes.length;
          const totalShots = allShots.length;
          const summary =
            totalShots > 0
              ? this.i18n.instant('STUDIO.SHOT_BUILDER.CHAT_REFINED', {
                  scenes: sceneCount,
                  shots: totalShots,
                })
              : this.i18n.instant('STUDIO.SHOT_BUILDER.CHAT_REFINED_EMPTY');
          this.chatMessages.update((items) => [
            ...items,
            {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              role: 'assistant',
              kind: 'refine',
              content: summary,
              timestamp: Date.now(),
              ...(targets?.length ? { targets } : {}),
              result,
            },
          ]);

          // Remember the applied change request for the viewer banner.
          this.lastRefineInfo.set({ changeRequest: scopedRequest });

          this.refineText.set('');
          this.refineExpanded.set(false);
        },
        error: (err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : this.i18n.instant('STUDIO.SHOT_BUILDER.CHAT_REFINE_FAILED');
          this.error.set(message);
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TITLE'),
            detail: message,
            life: 6000,
          });
        },
        complete: () => {
          this.loading.set(false);
        },
      });
  }

  /** "89-A" / "89-A, 90-B" label for targeted refines. */
  private targetLabel(targets: ShotRefineTarget[]): string {
    return targets.map((t) => `${t.sceneNumber}-${t.shotId}`).join(', ');
  }

  /** Last few user turns, bounded, for conversational coherence on refine. */
  private recentContext(): ChatTurn[] {
    return this.chatMessages()
      .filter((m) => m.role === 'user' && m.content.trim())
      .slice(-3)
      .map((m) => ({ role: 'user', content: m.content.slice(0, 500) }));
  }

  /** Restore an earlier version from the chat thread into the workspace. */
  restoreVersion(msg: ChatMessage): void {
    if (!msg.result) return;
    const result = msg.result;
    this.episodeData.set(result.episode || null);
    this.scenes.set(result.scenes);
    this.shots.set(result.scenes.flatMap((s) => s.shots ?? []));
    this.rawResponse.set(result.rawText);
    const seq = shotBuilderResultToSequence(result, this.studio.output().aspectRatio);
    this.sequenceData.set(seq ? computeCharacterCount(seq) : null);
    this.lastRefineInfo.set(null);

    this.chatMessages.update((items) => [
      ...items,
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        kind: 'refine',
        content: this.i18n.instant('STUDIO.SHOT_BUILDER.RESTORED'),
        timestamp: Date.now(),
      },
    ]);
  }

  /** Open the per-shot refine dialog for the given shot. */
  openRefineShot(target: ShotRefineTarget): void {
    this.targetRefine.set(target);
    this.refineShotText.set('');
    this.refineShotVisible.set(true);
  }

  /** Run the targeted refine from the per-shot dialog. */
  confirmRefineShot(): void {
    const instruction = this.refineShotText().trim();
    const target = this.targetRefine();
    this.refineShotVisible.set(false);
    this.targetRefine.set(null);
    if (!instruction || !target) return;
    this.runRefine(instruction, true, [target]);
  }

  /** Inline-card chip label for a shot: scene-prefixed id when available. */
  shotChipLabel(sceneNumber: number, shot: ShotBuilderShot): string {
    if (shot.id) return `${sceneNumber}-${shot.id}`;
    return `S${shot.number}`;
  }

  /** Dialog header for the per-shot refine. */
  readonly refineShotTitle = computed(() => {
    const t = this.targetRefine();
    if (!t) return '';
    return this.i18n.instant('STUDIO.SHOT_BUILDER.REFINE_SHOT_TITLE', {
      shot: `${t.sceneNumber}-${t.shotId}`,
    });
  });

  /** Dialog placeholder for the per-shot refine. */
  readonly refineShotPlaceholder = computed(() => {
    const t = this.targetRefine();
    if (!t) return '';
    return this.i18n.instant('STUDIO.SHOT_BUILDER.REFINE_SHOT_PLACEHOLDER', {
      shot: `${t.sceneNumber}-${t.shotId}`,
    });
  });

  clearChat(): void {
    this.chatMessages.set([]);
    this.episodeData.set(null);
    this.scenes.set([]);
    this.shots.set([]);
    this.rawResponse.set('');
    this.error.set(null);
    this.uploadedFiles.set([]);
    this.activeFileId.set(null);
    this.promptText.set('');
    this.sequenceData.set(null);
    this.lastRefineInfo.set(null);
  }

  copyArtifact(): void {
    const text = this.rawResponse();
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).catch(() => {
      this.error.set(this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_COPY_FAILED'));
    });
  }

  /** Set a shot's description as the studio's pre-prompt. */
  useShotAsPrePrompt(shot: ShotBuilderShot): void {
    this.studio.setRawDescription(shot.prompt_en || shot.description);
  }

  /** Check if a continuity carryover string is meaningful (not N/A, not empty). */
  isSignificant(value: string | undefined | null): boolean {
    if (!value) return false;
    const lower = value.toLowerCase();
    return !lower.startsWith('n/a') && lower !== 'none' && lower !== '' && lower !== 'no change';
  }

  /**
   * The sequence's aspect ratio when it is a value the video backend supports,
   * otherwise null — callers fall back to the studio's user-selected ratio.
   * Prevents an unsupported ratio from the response from breaking generation.
   */
  private validSequenceRatio(): string | null {
    const ratio = this.sequenceData()?.aspectRatio;
    return ratio && SUPPORTED_ASPECT_RATIOS.has(ratio) ? ratio : null;
  }

  /** Handle the "Crear listado de pre-prompts" button from the sequence viewer.
   *  Saves each shot with the prompt in the selected language as its description,
   *  then navigates to the first shot so the pre-prompt loads in the PromptBuilder. */
  /**
   * Handle the "Crear listado de pre-prompts" button from the sequence viewer.
   *
   * Groups the emitted shots by scene, resolving each scene (creating it when
   * it doesn't exist yet via its script number), then creates every shot under
   * its owning scene with its ORIGINAL number. Duplicate shot numbers are
   * allowed (the UNIQUE(scene_id, number) constraint was dropped).
   */
  onCreatePrePrompts(
    list: { sceneNumber: number; shotId: string; lang: 'en' | 'zh'; prompt: string }[],
  ): void {
    const projectId = this.projectId() || this.studio.projectId();
    const chapterId = this.chapterId() || this.studio.chapterId();
    if (!projectId || !chapterId || list.length === 0) return;

    this.savingShots.set(true);
    this.error.set(null);

    const createdIds: string[] = [];
    /** Per-shot format metadata (id + duration from the response), so the
     *  format persisted for each shot reflects ITS OWN values, not the episode's. */
    const createdShotMeta: { id: string; durationSeconds?: number }[] = [];
    const errors: string[] = [];
    let firstDescription = list[0]?.prompt || '';
    let firstSceneId = '';
    /** Summary of the scenes resolved/created (for the confirmation modal). */
    const createdScenes: CreationSceneSummary[] = [];
    /** First shot's own number/name — used for the parent's navigation. */
    let firstShotNumber = 1;
    let firstShotName = 'Shot 1';
    /** Scene that actually owns the first created shot (a scene whose shots all
     *  failed should not be the navigation target). */
    let firstShotSceneId = '';
    let firstShotSceneRecord: CreationSceneSummary | null = null;

    // Group list items by scene number (0 = legacy mock without scene grouping).
    const byScene = new Map<number, typeof list>();
    for (const item of list) {
      const key = item.sceneNumber || 0;
      if (!byScene.has(key)) byScene.set(key, []);
      byScene.get(key)!.push(item);
    }
    const groups = [...byScene.entries()];

    // Source-of-truth per-scene shot data (for names + character refs).
    const sceneByNumber = new Map<number, SceneData>();
    for (const s of this.scenes()) sceneByNumber.set(s.scriptNumber, s);

    const applyShotFormat = (): void => {
      // Only apply the response's ratio when the backend supports it.
      const ratio = this.validSequenceRatio();

      // The output format follows the first shot (the one the flow navigates to),
      // NOT the episode total — the total is irrelevant to a single generation.
      const first = createdShotMeta[0];
      const patch: Record<string, unknown> = {};
      if (ratio) patch['aspectRatio'] = ratio as AspectRatio;
      if (first?.durationSeconds && first.durationSeconds > 0) {
        patch['durationSeconds'] = Math.min(first.durationSeconds, MAX_SHOT_DURATION_SECONDS);
      }
      if (Object.keys(patch).length > 0) this.studio.patchOutput(patch as any);

      // Persist each shot's own duration (capped at the safety limit) + ratio.
      for (const meta of createdShotMeta) {
        const formatPayload: { aspect_ratio?: string; duration_seconds?: number } = {};
        if (ratio) formatPayload['aspect_ratio'] = ratio;
        if (meta.durationSeconds && meta.durationSeconds > 0) {
          formatPayload['duration_seconds'] = Math.min(
            meta.durationSeconds,
            MAX_SHOT_DURATION_SECONDS,
          );
        }
        if (Object.keys(formatPayload).length > 0) {
          this.studioApiService
            .updateShotFormat(projectId, chapterId, firstSceneId || '', meta.id, formatPayload)
            .subscribe();
        }
      }
    };

    const finish = (): void => {
      this.savingShots.set(false);
      const totalCreated = createdIds.length;
      this.chatMessages.update((items) => [
        ...items,
        {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          role: 'assistant',
          content:
            errors.length > 0
              ? this.i18n.instant('STUDIO.SHOT_BUILDER.CHAT_CREATED', {
                  shots: totalCreated,
                  scenes: groups.length,
                  warnings: errors.length,
                })
              : this.i18n.instant('STUDIO.SHOT_BUILDER.CHAT_CREATED_CLEAN', {
                  shots: totalCreated,
                  scenes: groups.length,
                }),
          timestamp: Date.now(),
        },
      ]);

      // Persist the output format immediately (independent of the navigation);
      // the redirect to the first scene/shot waits for the summary modal.
      applyShotFormat();

      // Store the navigation payload + show the creation summary modal.
      this.pendingShotsSaved =
        createdIds.length > 0 && firstShotSceneId
          ? {
              projectId,
              chapterId,
              sceneId: firstShotSceneId,
              firstSceneNumber: firstShotSceneRecord?.scriptNumber ?? 1,
              firstSceneName: firstShotSceneRecord?.scriptLocation || 'Scene',
              firstShotId: createdIds[0],
              firstShotNumber,
              firstShotName,
              firstShotDescription: firstDescription,
            }
          : null;
      this.creationSummary.set({
        scenes: createdScenes,
        shotsCreated: totalCreated,
        errors,
      });
      this.creationSummaryVisible.set(true);
    };

    let groupIdx = 0;

    const processGroup = (): void => {
      if (groupIdx >= groups.length) {
        finish();
        return;
      }

      const [sceneNumber, items] = groups[groupIdx];
      const sceneData = sceneByNumber.get(sceneNumber);
      // Whether the scene had to be created (vs already existing) — set by
      // resolveScene, read by the sceneRecord built once the scene resolves.
      let sceneWasCreated = false;

      const resolveScene = (cb: (sceneId: string) => void): void => {
        if (sceneNumber === 0) {
          // Legacy: fall back to the currently selected scene.
          cb(this.sceneId() || this.studio.sceneId() || '');
          return;
        }
        this.projectsApi.listScenes(projectId, chapterId).subscribe({
          next: (listRes) => {
            const existing = listRes.data?.find((s: any) => s.number === sceneNumber);
            if (existing?.id) {
              cb(existing.id);
              return;
            }
            this.projectsApi
              .createScene(projectId, chapterId, {
                number: sceneNumber,
                name: sceneData?.scriptLocation || `Scene ${sceneNumber}`,
                description: sceneData?.description || '',
              })
              .subscribe({
                next: (createRes) => {
                  if (createRes?.data?.id) {
                    sceneWasCreated = true;
                    cb(createRes.data.id);
                  } else {
                    errors.push(
                      `Failed to create Scene ${sceneNumber}: ${createRes?.msg || 'unknown error'}`,
                    );
                    groupIdx++;
                    processGroup();
                  }
                },
                error: (err: unknown) => {
                  errors.push(
                    `Failed to create Scene ${sceneNumber}: ${err instanceof Error ? err.message : 'unknown error'}`,
                  );
                  groupIdx++;
                  processGroup();
                },
              });
          },
          error: (err: unknown) => {
            errors.push(
              `Failed to list scenes for Scene ${sceneNumber}: ${err instanceof Error ? err.message : 'unknown error'}`,
            );
            groupIdx++;
            processGroup();
          },
        });
      };

      resolveScene((sceneId) => {
        if (!sceneId) {
          errors.push(`No scene available for shots #${sceneNumber}.`);
          groupIdx++;
          processGroup();
          return;
        }
        if (!firstSceneId) firstSceneId = sceneId;

        const sceneRecord: CreationSceneSummary = {
          scriptNumber: sceneNumber,
          scriptLocation:
            sceneNumber === 0
              ? this.sceneName() || 'Current scene'
              : sceneData?.scriptLocation || `Scene ${sceneNumber}`,
          created: sceneWasCreated,
          shotNumbers: [],
        };
        createdScenes.push(sceneRecord);

        let itemIdx = 0;
        const createShotNext = (): void => {
          if (itemIdx >= items.length) {
            groupIdx++;
            processGroup();
            return;
          }

          const item = items[itemIdx];
          // The shot's name/refs come from its position within the scene's
          // generated data (list preserves the flatten order).
          const shotRef = sceneData?.shots?.[itemIdx];
          const number = shotRef?.number ?? itemIdx + 1;
          const name = shotRef?.name || `Shot ${number}`;
          itemIdx++;

          this.shotBuilderService
            .createShot(projectId, chapterId, sceneId, {
              number,
              name,
              description: item.prompt,
            })
            .subscribe((res) => {
              if (res?.data?.id) {
                createdIds.push(res.data.id);
                createdShotMeta.push({ id: res.data.id, durationSeconds: shotRef?.duration });
                sceneRecord.shotNumbers.push(number);
                if (createdIds.length === 1) {
                  firstShotNumber = number;
                  firstShotName = name;
                  firstShotSceneId = sceneId;
                  firstShotSceneRecord = sceneRecord;
                }
                // Save character references (slots) — match by fileId first
                // (Claude receives the file UUID as assetId now), then id, then name.
                const refs = shotRef?.references || [];
                const charRefs = refs.filter((r: any) => r.type === 'character');
                if (charRefs.length > 0) {
                  const charData = this.studio.chapterCharacterData();
                  for (const ref of charRefs) {
                    const assetId = (ref.assetId || '').toLowerCase();
                    const match = charData.find(
                      (c) =>
                        c.fileId.toLowerCase() === assetId ||
                        c.id.toLowerCase() === assetId ||
                        c.name.toLowerCase() === assetId,
                    );
                    if (match) {
                      this.shotBuilderService
                        .assignCharacterToShot(
                          projectId,
                          chapterId,
                          sceneId,
                          res.data.id,
                          match.id,
                          ref.slot,
                        )
                        .subscribe();
                    }
                  }
                }
              }
              createShotNext();
            });
        };

        createShotNext();
      });
    };

    processGroup();
  }

  /** Confirm the creation-summary modal → navigate to the first scene + shot. */
  protected onCreationSummaryConfirm(): void {
    this.creationSummaryVisible.set(false);
    const pending = this.pendingShotsSaved;
    this.pendingShotsSaved = null;
    if (pending?.firstShotId) {
      this.shotsSaved.emit(pending);
    }
  }

  /** Load the real generate-shots response (response-ok.json) through the same
   *  pipeline as a live response — parse → mapper → native SEEDANCE viewer —
   *  so the mock behaves exactly like a real generation. */
  loadSequenceMock(): void {
    this.error.set(null);
    this.episodeData.set(null);
    this.scenes.set([]);
    this.rawResponse.set('');
    this.shots.set([]);
    this.sequenceData.set(null);
    this.lastRefineInfo.set(null);

    setTimeout(() => {
      // Normalize the seedance slots in the mock's prompts (@image1 → [Image1])
      // the same way parseShotsResponse does for live responses, so the mock
      // behaves exactly like a real generation. Non-mutating.
      const raw = responseOkMock as unknown as ShotBuilderResult;
      const result: ShotBuilderResult = {
        ...raw,
        scenes: raw.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) => ({
            ...shot,
            prompt_en: shot.prompt_en ? normalizeSeedanceSlots(shot.prompt_en) : shot.prompt_en,
            prompt_zh: shot.prompt_zh ? normalizeSeedanceSlots(shot.prompt_zh) : shot.prompt_zh,
          })),
        })),
      };

      this.episodeData.set(result.episode || null);
      this.scenes.set(result.scenes);
      this.rawResponse.set(JSON.stringify(responseOkMock, null, 2));

      // Flatten all shots from all scenes for legacy compat.
      const allShots: ShotBuilderShot[] = [];
      for (const scene of result.scenes) {
        for (const shot of scene.shots) {
          allShots.push(shot);
        }
      }
      this.shots.set(allShots);

      // Render the SEEDANCE-style native viewer from the real response.
      const seq = shotBuilderResultToSequence(result, this.studio.output().aspectRatio);
      this.sequenceData.set(seq ? computeCharacterCount(seq) : null);

      this.chatMessages.update((items) => [
        ...items,
        {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          role: 'assistant',
          content: `Loaded mock response: ${allShots.length} shots across ${result.scenes.length} scenes.`,
          timestamp: Date.now(),
        },
      ]);
      this.activeFileId.set(null);
    }, 400);
  }

  /** Show confirmation dialog before saving multi-scene/shots. */
  saveShotsToBackend(): void {
    if (this.scenes().length === 0) return;
    this.confirmDialogVisible.set(true);
  }

  /** Execute the multi-scene save after user confirmation. */
  onConfirmSave(): void {
    const projectId = this.projectId() || this.studio.projectId();
    const chapterId = this.chapterId() || this.studio.chapterId();
    const scenes = this.scenes();
    if (!projectId || !chapterId || scenes.length === 0) return;

    this.confirmDialogVisible.set(false);
    this.savingShots.set(true);
    this.error.set(null);

    // Step 1: resolve scene IDs (find existing or create new)
    // Step 2: create shots under each scene
    // Step 3: assign character references

    interface SceneResolved {
      scriptNumber: number;
      sceneId: string; // resolved from backend
      shots: ShotBuilderShot[];
    }

    const resolvedScenes: SceneResolved[] = [];
    const errors: string[] = [];

    // Resolve scenes sequentially: for each scene, list existing scenes
    // to find if one with this scriptNumber exists, or create a new one.
    const resolveScene = (index: number): void => {
      if (index >= scenes.length) {
        // All scenes resolved — now create shots
        createAllShots();
        return;
      }

      const scene = scenes[index];

      // List existing scenes for this chapter
      this.projectsApi.listScenes(projectId, chapterId).subscribe({
        next: (listRes) => {
          const existing = listRes.data?.find((s: any) => s.number === scene.scriptNumber);

          if (existing?.id) {
            // Scene already exists — use its ID
            resolvedScenes.push({
              scriptNumber: scene.scriptNumber,
              sceneId: existing.id,
              shots: scene.shots,
            });
            resolveScene(index + 1);
          } else {
            // Create new scene
            this.projectsApi
              .createScene(projectId, chapterId, {
                number: scene.scriptNumber,
                name: scene.scriptLocation,
                description: scene.description,
              })
              .subscribe({
                next: (createRes) => {
                  if (createRes?.data?.id) {
                    resolvedScenes.push({
                      scriptNumber: scene.scriptNumber,
                      sceneId: createRes.data.id,
                      shots: scene.shots,
                    });
                  } else {
                    errors.push(
                      `Failed to create Scene ${scene.scriptNumber}: ${createRes?.msg || 'unknown error'}`,
                    );
                  }
                  resolveScene(index + 1);
                },
                error: (err: unknown) => {
                  errors.push(
                    `Failed to create Scene ${scene.scriptNumber}: ${err instanceof Error ? err.message : 'unknown error'}`,
                  );
                  resolveScene(index + 1);
                },
              });
          }
        },
        error: (err: unknown) => {
          errors.push(
            `Failed to list scenes for Scene ${scene.scriptNumber}: ${err instanceof Error ? err.message : 'unknown error'}`,
          );
          resolveScene(index + 1);
        },
      });
    };

    let createdShotIds: string[] = [];
    let firstShotDescription = '';

    const createAllShots = (): void => {
      if (errors.length > 0 && resolvedScenes.length === 0) {
        this.savingShots.set(false);
        const errMsg = errors.join('; ');
        this.error.set(errMsg);
        this.toast.add({
          severity: 'error',
          summary: this.i18n.instant('STUDIO.SHOT_BUILDER.TOAST_SAVE_FAILED'),
          detail: errMsg,
          life: 8000,
        });
        return;
      }

      // Flatten: for each resolved scene, create all its shots
      let sceneIdx = 0;
      let shotIdx = 0;

      const createNextShot = (): void => {
        // Find next scene with shots remaining
        while (
          sceneIdx < resolvedScenes.length &&
          shotIdx >= resolvedScenes[sceneIdx].shots.length
        ) {
          sceneIdx++;
          shotIdx = 0;
        }

        if (sceneIdx >= resolvedScenes.length) {
          // All shots created — persist chapter-level resources
          // (characters + episode.assetAssignments from Claude)
          this.persistChapterAssignments(projectId, chapterId);

          this.savingShots.set(false);
          const totalCreated = createdShotIds.length;
          this.chatMessages.update((items) => [
            ...items,
            {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              role: 'assistant',
              content:
                errors.length > 0
                  ? `Saved ${totalCreated} shots across ${resolvedScenes.length} scenes with ${errors.length} warning(s).`
                  : `All ${totalCreated} shots saved across ${resolvedScenes.length} scenes successfully.`,
              timestamp: Date.now(),
            },
          ]);

          if (createdShotIds.length > 0) {
            const firstResolved = resolvedScenes[0];
            const firstShotData = firstResolved.shots[0];
            const firstSceneData = scenes.find(
              (s) => s.scriptNumber === firstResolved.scriptNumber,
            );
            this.shotsSaved.emit({
              projectId,
              chapterId,
              sceneId: firstResolved.sceneId,
              firstSceneNumber: firstResolved.scriptNumber,
              firstSceneName:
                firstSceneData?.scriptLocation || `Scene ${firstResolved.scriptNumber}`,
              firstShotId: createdShotIds[0],
              firstShotNumber: firstShotData?.number ?? 1,
              firstShotName: firstShotData?.name || 'Shot 1',
              firstShotDescription,
            });
          }
          return;
        }

        const s = resolvedScenes[sceneIdx];
        const shot = s.shots[shotIdx];
        const currentShotIdx = shotIdx;
        shotIdx++;

        const charData = this.studio.chapterCharacterData();
        const shotNumber = shot.number;

        // The pre-prompt (prompt.en) is the shot's most important content —
        // save it as the shot description so the PromptBuilder loads it.
        const shotDescription = shot.prompt_en || shot.description;
        this.shotBuilderService
          .createShot(projectId, chapterId, s.sceneId, {
            number: shotNumber,
            name: shot.name,
            description: shotDescription,
          })
          .subscribe((res) => {
            if (res?.data?.id) {
              const newShotId = res.data.id;
              createdShotIds.push(newShotId);
              if (createdShotIds.length === 1) {
                firstShotDescription = shotDescription;
              }

              // Save character references
              const refs = shot.references || [];
              const charRefs = refs.filter((r: any) => r.type === 'character');
              if (charRefs.length > 0) {
                for (const ref of charRefs) {
                  const assetId = (ref.assetId || '').toLowerCase();
                  const match = charData.find(
                    (c) =>
                      c.fileId.toLowerCase() === assetId ||
                      c.id.toLowerCase() === assetId ||
                      c.name.toLowerCase() === assetId,
                  );
                  if (match) {
                    this.shotBuilderService
                      .assignCharacterToShot(
                        projectId,
                        chapterId,
                        s.sceneId,
                        newShotId,
                        match.id,
                        ref.slot,
                      )
                      .subscribe();
                  }
                }
              }

              // Persist format from the response (validated ratio + per-shot
              // duration). Falls back to the studio's ratio when the response
              // ratio is missing or unsupported by the video backend.
              const ep = this.episodeData();
              if (ep) {
                const fmt: { aspect_ratio?: string; duration_seconds?: number } = {};
                const ratio = this.validSequenceRatio() ?? this.studio.output().aspectRatio;
                if (ratio) fmt['aspect_ratio'] = ratio;
                if (shot.duration && shot.duration > 0) {
                  fmt['duration_seconds'] = Math.min(shot.duration, MAX_SHOT_DURATION_SECONDS);
                }
                if (Object.keys(fmt).length > 0) {
                  this.studioApiService
                    .updateShotFormat(projectId, chapterId, s.sceneId, newShotId, fmt)
                    .subscribe();
                }
              }
            }
            createNextShot();
          });
      };

      createNextShot();
    };

    resolveScene(0);
  }

  /**
   * Persist chapter-level resources after shots are saved:
   * 1. Assign all chapter characters (from the store / "My Library").
   * 2. Assign episode.assetAssignments returned by Claude — characters are
   *    resolved and deduped against step 1; non-character assets go through
   *    the chapter assets endpoint.
   */
  private persistChapterAssignments(projectId: string, chapterId: string): void {
    const charData = this.studio.chapterCharacterData();
    const assigned = new Set<string>();
    for (const char of charData) {
      if (char.id) {
        assigned.add(char.id);
        this.projectsApi
          .assignCharacterToChapter(projectId, chapterId, char.id, char.slot)
          .subscribe();
      }
    }

    const ep = this.episodeData();
    for (const a of ep?.assetAssignments ?? []) {
      if (a.type === 'character') {
        const assetId = (a.assetId || '').toLowerCase();
        const match = charData.find(
          (c) =>
            c.fileId.toLowerCase() === assetId ||
            c.id.toLowerCase() === assetId ||
            c.name.toLowerCase() === assetId,
        );
        if (match?.id && !assigned.has(match.id)) {
          this.projectsApi
            .assignCharacterToChapter(projectId, chapterId, match.id, a.slot || match.slot)
            .subscribe();
        }
      } else if (a.assetId) {
        this.projectsApi.assignAssetToChapter(projectId, chapterId, a.assetId, a.slot).subscribe();
      }
    }
  }

  /** Switch to the Preview tab (shot list / artifact). */
  showPreviewTab(): void {
    this.activeFileId.set(null);
  }

  // ── Private ────────────────────────────────────────────────────────

  /** Content for a refine turn: the typed prompt plus only NEW (unsent) files.
   *  Files already sent to generate-shots are NOT resent — their content is
   *  already interpreted inside the previous breakdown (previous_response). */
  /** Build the scene context sent to Claude for both generate and refine:
   *  characters carry their portrait file id (resolved backend-side to a public
   *  vision URL) and slot; free assets carry id + filename + kind so the backend
   *  can decide which are image references worth analyzing. */
  private buildSceneContext(): SceneContext {
    return {
      description: this.studio.rawDescription() || undefined,
      characters: this.studio.chapterCharacterData().map((c) => ({
        ...(c.fileId ? { id: c.fileId } : {}),
        name: c.name,
        ...(c.slot ? { slot: c.slot } : {}),
      })),
      assets: this.studio.freeAssets().map((a) => ({
        id: a.id,
        filename: a.filename,
        mimeType:
          a.kind === 'image' ? 'image/png' : a.kind === 'video' ? 'video/mp4' : 'audio/mpeg',
      })),
    };
  }

  private getRefineContent(): string {
    const prompt = this.promptText().trim();
    // Images are excluded: Claude can't read a base64 blob in a text block.
    // Reference images are analyzed via scene_context (backend vision URLs).
    const newFiles = this.uploadedFiles().filter(
      (f) => !f.sent && !f.mimeType?.startsWith('image/'),
    );

    const parts: string[] = [];
    if (prompt) parts.push(prompt);

    if (newFiles.length > 0) {
      const names = newFiles.map((f) => f.name).join(', ');
      parts.push(`[Reference files: ${names}]`);
      newFiles.forEach((f) => {
        parts.push(`--- ${f.name} ---\n${f.sendContent ?? f.content}`);
      });
    }

    return parts.join('\n\n');
  }

  private getSendContent(): string {
    const prompt = this.promptText().trim();
    // Images are excluded: Claude can't read a base64 blob in a text block.
    // Reference images are analyzed via scene_context (backend vision URLs).
    const files = this.uploadedFiles().filter((f) => !f.mimeType?.startsWith('image/'));

    if (!prompt && files.length === 0) return '';

    const parts: string[] = [];
    if (prompt) parts.push(prompt);

    if (files.length > 0) {
      const names = files.map((f) => f.name).join(', ');
      parts.push(`[Reference files: ${names}]`);
      files.forEach((f) => {
        parts.push(`--- ${f.name} ---\n${f.sendContent ?? f.content}`);
      });
    }

    return parts.join('\n\n');
  }
}

/** Extract the numeric part of an [ImageN]/[VideoN]/[AudioN] slot; 0 when absent. */
function slotNum(slot: string | undefined): number {
  if (!slot) return 0;
  const m = slot.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}
