import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environment/environment';
import { catchError, of } from 'rxjs';
import { SplitterModule } from 'primeng/splitter';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { StudioStore } from '@app/core/stores/studio.store';
import { SessionStore } from '@app/core/stores/session.store';
import {
  ShotBuilderService,
  ShotBuilderShot,
  ShotBuilderResult,
} from '@app/services/shot-builder.service';
import { ShotBuilderSettingsDialogComponent } from './components/shot-builder-settings-dialog.component';

/** Parse .docx files into HTML for preview. */
import * as mammoth from 'mammoth';
/** Parse .xlsx files into structured data for preview. */
import * as XLSX from 'xlsx';
/** Render structured shot data as artifact HTML. */
import {
  generateArtifactHtml,
  parseArtifactData,
  computeCharacterCount,
  ArtifactData,
} from '@app/services/shot-builder-artifact';
import { SHOT_BUILDER_RESPONSE, SHOT_SEQUENCE } from '@app/core/mocks/shots-builder.mock';
import { Sequence } from '@app/core/interfaces';
import { ShotSequenceViewerComponent } from './components/shot-sequence-viewer.component';
import { CLAUDE_MODELS } from '@app/core/constants';

/**
 * System prompts are now managed server-side in the backend handler.
 * The frontend sends system_prompt as empty string, and the backend
 * applies the appropriate system prompt based on the endpoint:
 *   - ClaudeGenerateShots  → shot builder system prompt (JSON shot list)
 *   - ClaudeOptimizePrompt → proncer system prompt (refine prompts only)
 */
const SHOT_BUILDER_SYSTEM_PROMPT = '';
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
  /** Whether this file has been sent with the last message. */
  sent: boolean;
};

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shot-builder-panel.component.html',
  styleUrls: ['./shot-builder-panel.component.css'],
})
export class ShotBuilderPanelComponent {
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
  private readonly sanitizer = inject(DomSanitizer);
  private readonly http = inject(HttpClient);

  readonly promptText = signal('');
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly uploadedFiles = signal<UploadedFile[]>([]);
  readonly activeFileId = signal<string | null>(null);

  /** The parsed shot list from Claude. */
  readonly shots = signal<ShotBuilderShot[]>([]);
  /** The raw text response for display. */
  readonly rawResponse = signal<string>('');

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

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

  /** True when the "Preview" tab (artifact / shot list) is selected. */
  readonly isPreviewTab = computed(() => this.activeFileId() === null);

  /** True when there are parsed shots to show. */
  readonly hasShots = computed(() => this.shots().length > 0);

  /** True while saving shots to the backend. */
  readonly savingShots = signal(false);

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
      const isOfficeDoc =
        mimeType.includes('openxmlformats-officedocument.wordprocessingml') ||
        mimeType.includes('openxmlformats-officedocument.spreadsheetml') ||
        mimeType.includes('msword') ||
        mimeType.includes('ms-excel');
      const reader = new FileReader();

      reader.onload = async () => {
        let content = typeof reader.result === 'string' ? reader.result : '';

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
          { name: file.name, content, mimeType, sent: false },
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

      if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
        reader.readAsDataURL(file);
      } else if (isOfficeDoc) {
        // Read as ArrayBuffer so mammoth/xlsx can parse
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
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

    const userName = this.sessionStore.user()?.handle || '';
    const selectedSkill = this.studio.selectedSkill();

    this.shotBuilderService
      .generate({
        projectId: this.projectId() || this.studio.projectId() || '',
        sceneId: this.sceneId() || this.studio.sceneId() || '',
        prompt: content,
        systemPrompt: SHOT_BUILDER_SYSTEM_PROMPT,
        model: this.claudeModelName(),
        skillID: selectedSkill?.id || undefined,
        userName,
        generateZh: this.generateChinese(),
      })
      .subscribe({
        next: (result: ShotBuilderResult) => {
          console.log('SHOT BUILDER RESULT', result);

          this.shots.set(result.shots);
          this.rawResponse.set(result.rawText);

          // If the result includes rich Sequence data, show the native viewer
          if (result.sequence) {
            this.sequenceData.set(result.sequence);
          }

          // Add assistant message to chat
          const shotCount = result.shots.length;
          const hasRaw = result.rawText.length > 0;
          const summary =
            shotCount > 0
              ? `Generated ${shotCount} shot${shotCount > 1 ? 's' : ''}. See the preview tab for details.`
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
        },
        complete: () => {
          this.loading.set(false);
          console.log(this.shotBuilderService.errorMessage());
        },
      });
  }

  clearChat(): void {
    this.chatMessages.set([]);
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
    this.studio.setRawDescription(shot.description);
  }

  /** Handle the "Crear listado de pre-prompts" button from the sequence viewer. */
  onCreatePrePrompts(list: { shotId: string; lang: 'en' | 'zh'; prompt: string }[]): void {
    console.log('[shot-builder] Pre-prompts list:', list);
    // TODO: implement pre-prompt generation logic
  }

  /** Load mock data from SHOT_BUILDER_RESPONSE for testing artifact rendering. */
  loadMockResponse(): void {
    this.loading.set(true);
    this.error.set(null);
    this.shots.set([]);
    this.rawResponse.set('');

    setTimeout(() => {
      // Set the raw text from the mock directly — artifactHtml will parse it
      this.rawResponse.set(SHOT_BUILDER_RESPONSE.text);
      this.chatMessages.update((items) => [
        ...items,
        {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          role: 'assistant',
          content: 'Loading mock response... check the preview tab.',
          timestamp: Date.now(),
        },
      ]);
      this.activeFileId.set(null);
      this.loading.set(false);
    }, 800);
  }

  /** Load mock Sequence data for testing the native Angular viewer. */
  loadSequenceMock(): void {
    this.error.set(null);
    this.rawResponse.set('');
    this.shots.set([]);

    setTimeout(() => {
      this.sequenceData.set(computeCharacterCount(SHOT_SEQUENCE));
      this.chatMessages.update((items) => [
        ...items,
        {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          role: 'assistant',
          content: `Loaded mock sequence shots.`,
          timestamp: Date.now(),
        },
      ]);
      this.activeFileId.set(null);
    }, 400);
  }

  /** Save generated shots to the backend as real shot records. */
  saveShotsToBackend(): void {
    const projectId = this.projectId() || this.studio.projectId();
    const chapterId = this.chapterId() || this.studio.chapterId();
    const sceneId = this.sceneId() || this.studio.sceneId();
    const currentShots = this.shots();
    if (!projectId || !chapterId || !sceneId || currentShots.length === 0) return;

    this.savingShots.set(true);
    this.error.set(null);

    // Create each shot sequentially
    let index = 0;
    const total = currentShots.length;

    const createNext = (): void => {
      if (index >= total) {
        this.savingShots.set(false);
        this.chatMessages.update((items) => [
          ...items,
          {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: 'assistant',
            content: `All ${total} shots saved to the scene successfully.`,
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const shot = currentShots[index];
      index++;

      this.http
        .post<{ success: boolean; data?: { id: string }; message?: string }>(
          `${environment.API_URL}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots`,
          { number: shot.number, name: shot.name, description: shot.description },
        )
        .pipe(
          catchError(() => {
            createNext();
            return of(null);
          }),
        )
        .subscribe(() => {
          createNext();
        });
    };

    createNext();
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
        parts.push(`--- ${f.name} ---\n${f.content}`);
      });
    }

    return parts.join('\n\n');
  }
}
