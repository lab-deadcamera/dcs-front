import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SplitterModule } from 'primeng/splitter';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
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
  normalizeSeedanceSlots,
  shotBuilderResultToSequence,
} from '@app/services/shot-builder.service';
import { ShotBuilderSettingsDialogComponent } from './components/shot-builder-settings-dialog.component';

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
import responseOkMock from '@app/core/mocks/new-response-2.json';
import { Sequence } from '@app/core/interfaces';
import { ShotSequenceViewerComponent } from './components/shot-sequence-viewer.component';
import { CLAUDE_MODELS } from '@app/core/constants';
import { ModelService } from '@app/services/model.service';
import { AspectRatio } from '@app/core/interfaces/studio.models';
import { SourceAssetPipe } from '@app/core/pipes/source-asset.pipe';
import { StudioApiService } from '@app/services/studio-api.service';
import { ProjectsApiService } from '@app/modules/projects/projects/services/projects-api.service';
import { SourceThumbnailAssetPipe } from '@app/core/pipes';

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
  '16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '9:21', '2.35:1',
]);

/** Safety cap for a single generated shot's duration, in seconds. */
const MAX_SHOT_DURATION_SECONDS = 15;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
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
    ShotSequenceViewerComponent,
    ShotBuilderSettingsDialogComponent,
    DialogModule,
    SourceThumbnailAssetPipe,
    SourceAssetPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shot-builder-panel.component.html',
  styleUrls: ['./shot-builder-panel.component.css'],
  providers: [MessageService],
})
export class ShotBuilderPanelComponent {
  constructor() {
    this.validateClaudeModel();
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
  private readonly modelService = inject(ModelService);
  private readonly toast = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly promptText = signal('');
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly uploadedFiles = signal<UploadedFile[]>([]);
  readonly activeFileId = signal<string | null>(null);

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
  protected readonly toggleFullscreen = () => this.fullscreen.update((v) => !v);

  // ── Skill & Model selection ────────────────────────────────────

  protected readonly settingsDialogVisible = signal(false);
  protected readonly skillDialogVisible = signal(false);

  /** Claude model for the shot builder — independent from studio video model. */
  private readonly claudeModelName = signal<string>(CLAUDE_MODELS[0].name);
  /** Whether to generate Chinese prompts (prompt.zh). */
  protected readonly generateChinese = signal(true);

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

  /** Pretty-printed JSON of the current episode + scenes data for the preview modal. */
  protected readonly previewDataPretty = computed(() => {
    const snapshot: Record<string, unknown> = {};
    const ep = this.episodeData();
    if (ep) snapshot['episode'] = ep;
    const sc = this.scenes();
    if (sc.length > 0) snapshot['scenes'] = sc;
    const raw = this.rawResponse();
    if (raw) snapshot['rawLength'] = raw.length;

    if (Object.keys(snapshot).length === 0) return 'No data available. Generate shots first.';

    return JSON.stringify(snapshot, null, 2);
  });

  // ── Episode Assets preview ─────────────────────────────────────────

  /** Collapsed/expanded state for the episode assets section. */
  protected readonly episodeAssetsExpanded = signal(true);

  /** Chapter characters sorted by their @imageN slot number (slot-less last). */
  protected readonly sortedChapterCharacters = computed(() => {
    return [...this.studio.chapterCharacterData()].sort(
      (a, b) => slotNum(a.slot) - slotNum(b.slot),
    );
  });

  /** Episode assets sorted by their @imageN slot number (slot-less last). */
  protected readonly sortedFreeAssets = computed(() => {
    const slotOf = (id: string) => slotNum(this.studio.chapterAssetSlots().get(id) ?? '');
    return [...this.studio.freeAssets()].sort((a, b) => slotOf(a.id) - slotOf(b.id));
  });

  /** Navigate to the Providers section so the user can create the missing model. */
  protected onGoToProviders(): void {
    this.modelWarningVisible.set(false);
    window.location.href = '/providers';
  }

  /** True when scene assignments have been loaded at least once. */
  protected readonly assignmentsLoaded = computed(() => this.studio.assignmentsLoaded());

  /** IDs of thumbnails that failed to load. */
  private readonly brokenThumbs = signal<Set<string>>(new Set());

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

  /** Tooltip label for an episode asset: its @imageN slot when assigned, else
   *  the filename. */
  protected chapterAssetSlotLabel(id: string, filename: string): string {
    return this.studio.chapterAssetSlots().get(id) || filename;
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
        `    - Scene ${s.scriptNumber}: ${s.scriptLocation} (${s.shots.length} shot${s.shots.length !== 1 ? 's' : ''})`,
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
    console.log(
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
            console.error('[pdf] failed to extract text from', file.name, err);
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
        this.error.set('Failed to read file');
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

  /** Extract plain text from a PDF using pdfjs-dist. */
  private async extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
    const task = getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await task.promise;
    try {
      const parts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        parts.push(`[Page ${i}]\n${pageText}`);
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
    const content = this.getSendContent();
    if (!content) return;

    // Add user message to chat
    this.chatMessages.update((items) => [
      ...items,
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      },
    ]);

    // Mark files as sent
    this.uploadedFiles.update((items) => items.map((f) => ({ ...f, sent: true })));

    // Switch to Preview tab so the artifact is visible
    this.activeFileId.set(null);

    this.loading.set(true);
    this.error.set(null);
    this.shots.set([]);
    this.rawResponse.set('');
    this.sequenceData.set(null);

    const userName = this.sessionStore.user()?.handle || '';
    const selectedSkill = this.studio.selectedSkill();

    // Build scene context from the store for richer generation:
    // characters + free assets loaded via setChapterAssignments()
    // when the chapter was selected.
    const sceneContext: SceneContext = {
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

    this.shotBuilderService
      .generate({
        projectId: this.projectId() || this.studio.projectId() || '',
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
              ? `Generated${epPrefix} ${sceneCount} scene${sceneCount > 1 ? 's' : ''} with ${totalShots} shot${totalShots > 1 ? 's' : ''}. See the preview tab for details.`
              : hasRaw
                ? 'Response received. Check the preview tab for the shot list.'
                : 'Response received but no content could be parsed.';
          this.chatMessages.update((items) => [
            ...items,
            {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              role: 'assistant',
              content: summary,
              timestamp: Date.now(),
            },
          ]);
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to generate shots';
          this.error.set(message);
          this.loading.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Shot Builder',
            detail: message,
            life: 6000,
          });
        },
        complete: () => {
          this.loading.set(false);
        },
      });
  }

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
  }

  copyArtifact(): void {
    const text = this.rawResponse();
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).catch(() => {
      this.error.set('Failed to copy to clipboard');
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
              ? `Created ${totalCreated} shot${totalCreated !== 1 ? 's' : ''} across ${groups.length} scene${groups.length !== 1 ? 's' : ''} with ${errors.length} warning(s).`
              : `Created ${totalCreated} shot${totalCreated !== 1 ? 's' : ''} across ${groups.length} scene${groups.length !== 1 ? 's' : ''}.`,
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

    setTimeout(() => {
      // Normalize the seedance slots in the mock's prompts ([Image1] → @image1)
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
          summary: 'Save failed',
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

  private getSendContent(): string {
    const prompt = this.promptText().trim();
    const files = this.uploadedFiles();

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

/** Extract the numeric part of an @imageN/@videoN/@audioN slot; 0 when absent. */
function slotNum(slot: string | undefined): number {
  if (!slot) return 0;
  const m = slot.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}
