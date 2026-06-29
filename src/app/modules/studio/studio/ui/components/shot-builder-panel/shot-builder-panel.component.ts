import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SplitterModule } from 'primeng/splitter';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { StudioStore } from '@app/core/stores/studio.store';
import { SessionStore } from '@app/core/stores/session.store';
import {
  ShotBuilderService,
  ShotBuilderShot,
  ShotBuilderResult,
} from '@app/services/shot-builder.service';
import { TooltipModule } from 'primeng/tooltip';

/** Parse .docx files into HTML for preview. */
import * as mammoth from 'mammoth';
/** Parse .xlsx files into structured data for preview. */
import * as XLSX from 'xlsx';

/** System prompt sent to Claude to enforce the shot-list JSON format. 
 
For each shot, provide:
- number: sequential integer
- name: short descriptive title
- description: detailed visual description that will serve as the video generation prompt (pre-prompt) — include camera angle, framing, character actions, lighting cues, and atmosphere

Return a valid JSON object with this exact structure:
{
  "shots": [
    { "number": 1, "name": "Establishing wide", "description": "Wide shot of the warehouse interior..." },
    { "number": 2, "name": "Close-up protagonist", "description": "Close-up on John's face..." }
    ]
    }
    
    CRITICAL: The "description" field must be a complete, self-contained video-generation prompt (in English).
    CRITICAL: Return ONLY the JSON object, no markdown fences, no extra text.`;
    */
const SHOT_BUILDER_SYSTEM_PROMPT = `You are a professional film director's assistant. Given a scene description, reference files, and optional user instructions, generate a detailed shot list.`;
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
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shot-builder-panel.component.html',
  styleUrls: ['./shot-builder-panel.component.css'],
})
export class ShotBuilderPanelComponent {
  private readonly studio = inject(StudioStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly shotBuilderService = inject(ShotBuilderService);
  private readonly sanitizer = inject(DomSanitizer);

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
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(this.activeFileMimeType()),
  );
  readonly isXlsxPreview = computed(() =>
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(this.activeFileMimeType()),
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

    const projectId = this.studio.projectId();
    const sceneId = this.studio.sceneId();
    const userName = this.sessionStore.user()?.handle || '';

    this.shotBuilderService
      .generate({
        projectId: projectId || '',
        sceneId: sceneId || '',
        prompt: content,
        systemPrompt: SHOT_BUILDER_SYSTEM_PROMPT,
        userName,
      })
      .subscribe({
        next: (result: ShotBuilderResult) => {
          this.shots.set(result.shots);
          this.rawResponse.set(result.rawText);

          // Add assistant message to chat
          const shotCount = result.shots.length;
          const summary =
            result.shots.length > 0
              ? `Generated ${shotCount} shot${shotCount > 1 ? 's' : ''}. See the preview tab for details.`
              : 'Response received but no shots could be parsed. Check the raw text below.';
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
