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
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Editor, EditorModule } from 'primeng/editor';
import { Popover } from 'primeng/popover';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { SourceAssetPipe } from '@app/core/pipes/source-asset.pipe';
import { SourceThumbnailAssetPipe } from '@app/core/pipes/source-thumbnail-asset.pipe';
import { AssetInfoPopoverComponent } from '@shared/components/asset-info-popover/asset-info-popover.component';
import { StudioStore } from '@app/core/stores/studio.store';
import { SessionStore } from '@app/core/stores/session.store';
import { TranslatorApiService } from '@app/services/translator-api.service';
import { ShotBuilderService } from '@app/services/shot-builder.service';
import { UsedAsset, UsedAssetKind } from '@core/interfaces/studio.models';
import { buildSlotReferences } from '@core/utils/slot-reindex';
import { CharactersService } from '@app/modules/characters/characters/services';
import { AssetType, CharacterMetadata } from '@app/modules/characters/characters/interfaces';
import { Tooltip } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';

/**
 * Section 06 — PROMPT BUILDER.
 *
 * Rich-text editor (PrimeNG Editor / Quill, toolbar hidden) that holds
 * the prompt the user writes. Presets inject themselves into the matching
 * section headers so what the user sees is exactly the text that gets sent
 * to the Seedance API. Reference assets live as chips on top and travel
 * through the API payload separately.
 */
@Component({
  selector: 'app-prompt-builder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prompt-builder.component.html',
  imports: [
    SectionHeaderComponent,
    SourceAssetPipe,
    SourceThumbnailAssetPipe,
    TranslatePipe,
    UpperCasePipe,
    EditorModule,
    FormsModule,
    Popover,
    Tooltip,
    SelectModule,
    SelectButtonModule,
    AssetInfoPopoverComponent,
  ],
  styles: [
    `
      :host ::ng-deep .p-editor-toolbar {
        display: none !important;
      }
      :host ::ng-deep .p-editor-content .ql-editor {
        min-height: 300px;
        padding: 12px 16px;
        font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
        font-size: 12px;
        line-height: 1.625;
        background: transparent;
      }

      /* Chip action menu (Borrar / Reemplazar) */
      .chip-menu {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 150px;
        padding: 8px;
        background: var(--panel, #121f21);
      }
      .chip-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 7px 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink, #ece6d8);
        background: transparent;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .chip-menu-item:hover {
        border-color: var(--teal, #4fb0b5);
        background: rgba(79, 176, 181, 0.08);
      }
      .chip-menu-delete:hover {
        border-color: #e0653c;
        color: #e0653c;
        background: rgba(224, 101, 60, 0.08);
      }

      /* Replace picker */
      .replace-picker {
        width: 325px;
        padding: 14px;
        background: var(--panel, #121f21);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .replace-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: var(--ink-dim, #9aa6a3);
        margin: 0;
      }
      .replace-title b {
        color: var(--amber, #e0a95c);
        font-weight: 700;
      }
      .replace-search {
        width: 100%;
        box-sizing: border-box;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--ink, #ece6d8);
        background: var(--bg2, #0f1a1c);
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        padding: 4px 8px;
        outline: none;
      }
      .replace-search:focus {
        border-color: var(--teal, #4fb0b5);
      }
      .replace-tabs {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .replace-tab {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9.5px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink-dim, #9aa6a3);
        background: transparent;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        padding: 3px 7px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .replace-tab:hover {
        color: var(--ink, #ece6d8);
      }
      .replace-tab.on {
        color: var(--ink, #ece6d8);
        border-color: var(--teal, #4fb0b5);
      }
      .replace-count {
        color: var(--amber, #e0a95c);
        font-size: 9px;
      }
      .replace-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
        gap: 6px;
        max-height: 180px;
        overflow-y: auto;
      }
      .replace-tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 4px;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        background: var(--bg2, #0f1a1c);
        cursor: pointer;
        transition: border-color 0.15s ease;
      }
      .replace-tile:hover {
        border-color: var(--teal, #4fb0b5);
      }
      .replace-img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 2px;
      }
      .replace-placeholder {
        width: 100%;
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ink-faint, #6a7977);
        font-size: 14px;
      }
      .replace-name {
        width: 100%;
        font-family: 'JetBrains Mono', monospace;
        font-size: 8.5px;
        color: var(--ink-dim, #9aa6a3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }
      .replace-empty {
        font-size: 12px;
        color: var(--ink-faint, #6a7977);
        font-style: italic;
        margin: 0;
      }
      .replace-episode-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9.5px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--amber, #e0a95c);
        margin: 8px 0 4px;
      }
      .replace-slot {
        display: block;
        color: var(--amber, #e0a95c);
        font-style: normal;
      }
    `,
  ],
})
export class PromptBuilderComponent implements OnInit {
  @ViewChild('editor') private editorRef!: Editor;
  @ViewChild('translatePop') private translatePopRef!: Popover;
  @ViewChild('translateBtn') private translateBtn!: { nativeElement: HTMLElement };
  @ViewChild('assetInfoPopover') protected readonly assetInfoPopover!: AssetInfoPopoverComponent;
  protected readonly studio = inject(StudioStore);
  protected readonly session = inject(SessionStore);
  private readonly translator = inject(TranslatorApiService);
  private readonly shotBuilder = inject(ShotBuilderService);
  private readonly i18n = inject(TranslateService);
  private readonly chars = inject(CharactersService);
  protected readonly translating = signal(false);
  protected readonly translatedText = signal<string | null>(null);

  protected languageNotSupported = signal<boolean>(false);

  /** Selected target language for the translate button. */
  protected readonly translateLang = signal<'en' | 'es' | 'zh'>('en');
  protected readonly sourceLang = signal<'en' | 'es' | 'zh' | ''>('');
  protected readonly translationLangOptions = [
    { label: 'EN', value: 'en' as const },
    { label: 'ES', value: 'es' as const },
    { label: '中文', value: 'zh' as const },
  ];

  /** Cache of translated text per language — avoids re-translating. */
  private readonly translationCache = new Map<string, string>();

  /** True when the current translateLang has a cached translation. */
  protected readonly hasCachedTranslation = computed(() =>
    this.translationCache.has(this.translateLang()),
  );

  /** Wire this in the parent shell to actually fire the generation call. */
  readonly generate = output<void>();

  /**
   * Wire this in the parent shell to run a dry-run preview against the
   * backend (same payload as generate) and surface the result in a modal.
   */
  readonly preview = output<void>();

  /** When true, the generate button reads "VOLVER A GENERAR". */
  readonly isRegenerating = input(false);
  /** When false, the generate button is disabled (no take selected). */
  readonly takeSelected = input(true);
  /**
   * When false, the secondary "Preview" button is hidden. Defaults to false
   * because preview is a privileged dry-run surface (SUPER_ADMIN only) —
   * the parent shell flips it on via `[canPreview]` based on the session
   * role level so the rest of the studio chrome stays auth-agnostic.
   */
  readonly canPreview = input(false);

  /** Re-resolve placeholder when the language changes. */
  private readonly lang = toSignal(this.i18n.onLangChange, { initialValue: null });

  protected readonly placeholder = computed(() => {
    this.lang();
    return this.i18n.instant('STUDIO.PROMPT.PLACEHOLDER');
  });

  protected readonly charCount = computed(() => {
    this.lang();
    return this.i18n.instant('STUDIO.PROMPT.CHARS', { n: this.studio.rawLength() });
  });

  // ── Reference assets grouped by kind ──────────────────────────────

  protected readonly imageAssets = computed(() =>
    this.studio.usedAssets().filter((a) => a.kind === 'image' || a.kind === 'mixed'),
  );
  protected readonly videoAssets = computed(() =>
    this.studio.usedAssets().filter((a) => a.kind === 'video'),
  );
  protected readonly audioAssets = computed(() =>
    this.studio.usedAssets().filter((a) => a.kind === 'audio'),
  );

  /**
   * Positional display number per asset fileId, per kind (1..N), in the exact
   * order the references are attached to the payload: first frame, last frame,
   * then used assets. This is the single source of truth for the chip label,
   * the inserted token and the stale-token prune. Because it follows the
   * payload order, what the chips show always matches the [ImageN]/[VideoN]/[AudioN]
   * tokens the model resolves against the reference items.
   */
  protected readonly assetNumbers = computed(() => {
    const refs = buildSlotReferences(
      this.studio.firstFrame(),
      this.studio.lastFrame(),
      this.studio.usedAssets(),
    );
    const map = new Map<string, number>();
    const counts: Record<'image' | 'video' | 'audio', number> = {
      image: 0,
      video: 0,
      audio: 0,
    };
    for (const r of refs) {
      counts[r.kind]++;
      map.set(r.fileId, counts[r.kind]);
    }
    return map;
  });

  protected readonly sectionLabels: {
    image: string;
    video: string;
    audio: string;
  } = {
    image: 'STUDIO.PROMPT.REFERENCES_IMAGES',
    video: 'STUDIO.PROMPT.REFERENCES_VIDEO',
    audio: 'STUDIO.PROMPT.REFERENCES_AUDIO',
  };

  // ── Editor content ───────────────────────────────────────────────

  /** HTML content bound to the PrimeNG Editor via ngModel. */
  protected editorContent = signal('');

  /** Flag to prevent syncing store → editor when the change originated from the editor. */
  private skipStoreSync = false;

  /** Last detected source language — used to re-detect when the prompt changes (e.g. take switch). */
  private lastDetectedSource: 'en' | 'es' | 'zh' | '' = '';

  /**
   * Last observed number of chips per kind. Tokens are pruned only when the
   * count *decreases*, so legitimate text written manually (or hydrated from
   * storage on first paint) is never wiped out by the initial run.
   */
  private prevCounts = { image: 0, video: 0, audio: 0 };

  constructor() {
    this.editorContent.set(this.studio.rawDescription());

    effect(() => {
      const storeVal = this.studio.rawDescription();
      if (!this.skipStoreSync) {
        const currentText = this.stripHtml(this.editorContent());
        if (currentText !== storeVal) {
          this.editorContent.set(storeVal);
        }
      }
      this.skipStoreSync = false;
    });

    // Auto-detect source language whenever rawDescription changes and the
    // detected language differs from the previous one. Covers initial load
    // AND take switches (store sets _rawDescription directly, bypassing
    // setRawDescription so skipStoreSync is NOT set).
    effect(() => {
      const text = this.studio.rawDescription();
      if (!text) return;
      const detected = this.detectSourceLang(text);
      this.translateLang.set(detected as any);
      if (detected && detected !== this.lastDetectedSource) {
        this.lastDetectedSource = detected;
      }
    });

    // When the user removes a chip, drop the matching tokens from the editor
    // so the prompt text mirrors the chip strip. A token is stale when its
    // number is not one of the numbers currently assigned to chips of that
    // kind (assetNumbers honors inherited slots and next-free fill). Deferred
    // via microtask so Quill is settled before we mutate it.
    effect(() => {
      const nums = this.assetNumbers();
      const used = this.studio.usedAssets();
      // A one-shot flag set when a resource is unbound from "Mi biblioteca":
      // the slot token must stay in the prompt, so skip the prune for this
      // shrink and clear the flag.
      const skipPrune = this.studio.skipNextTokenPrune();
      const allowed = (kind: UsedAssetKind): Set<number> => {
        const s = new Set<number>();
        for (const a of used) {
          if (a.kind !== kind && !(kind === 'image' && a.kind === 'mixed')) continue;
          const n = nums.get(a.fileId);
          if (n !== undefined) s.add(n);
        }
        return s;
      };
      const next = {
        image: allowed('image'),
        video: allowed('video'),
        audio: allowed('audio'),
      };
      const shrunk = {
        image: next.image.size < this.prevCounts.image,
        video: next.video.size < this.prevCounts.video,
        audio: next.audio.size < this.prevCounts.audio,
      };
      this.prevCounts = {
        image: next.image.size,
        video: next.video.size,
        audio: next.audio.size,
      };
      if (skipPrune) {
        this.studio.clearSkipTokenPrune();
        return;
      }
      if (!shrunk.image && !shrunk.video && !shrunk.audio) return;
      queueMicrotask(() => {
        if (shrunk.image) this.pruneStaleTokens('image', next.image);
        if (shrunk.video) this.pruneStaleTokens('video', next.video);
        if (shrunk.audio) this.pruneStaleTokens('audio', next.audio);
      });
    });
  }

  ngOnInit(): void {}

  /** Called by the editor on every user keystroke. Syncs plain text to the store. */
  protected onTextChange(event: { textValue: string }) {
    this.skipStoreSync = true;
    this.studio.setRawDescription(event.textValue || '');
    this.translationCache.clear();
  }

  protected onGenerate(): void {
    if (!this.studio.canGenerate()) return;
    this.generate.emit();
  }

  protected onPreview(): void {
    if (!this.studio.canGenerate()) return;
    this.preview.emit();
  }

  /**
   * Called when the user selects a language from p-selectButton.
   * If we already have a cached translation for this language, show the
   * popover immediately. Otherwise, translate and show the loading state.
   */
  protected onLanguageSelected(): void {
    const targetLang = this.translateLang();
    if (!targetLang) return;
    const text = this.studio.rawDescription();
    if (!text) return;

    // If already cached, just show the popover
    const cached = this.translationCache.get(targetLang);
    if (cached) {
      this.translatedText.set(cached);
      this.translating.set(false);
      this.openPopoverFromLang();
      return;
    }

    this.translating.set(true);
    // Start translation
    this.languageNotSupported.set(false);
    this.translatedText.set(null);
    this.openPopoverFromLang();

    // Chinese targets go straight to Claude: NLLB (600M distilled) degrades
    // technical cinematography prompts, and the zh prompt is what Seedance
    // renders — it has to be clean. Covers EN → zh and any other source → zh.
    if (targetLang === 'zh') {
      this.translateWithClaudeFallback(text, targetLang);
      return;
    }

    // Resolve the source language: last confirmed value, else the instant
    // heuristic, else 'auto' (the backend's fasttext detector decides and
    // returns detectedLanguage). This prevents the deadlock where sourceLang
    // is '' and the backend rejects source:'' as "Idioma no soportado".
    const src = this.sourceLang() || this.detectSourceLang(text) || 'auto';

    this.translator.translate(text, targetLang, src, true).subscribe({
      next: (res) => {
        this.languageNotSupported.set(false);
        this.translatedText.set(res.translatedText);
        this.translationCache.set(targetLang, res.translatedText);
        // Learn the authoritative source from the backend detector so
        // sourceLang is populated without asking the user.
        const detected = res.detectedLanguage?.language;
        if (detected && ['en', 'es', 'zh'].includes(detected)) {
          this.sourceLang.set(detected as any);
        }
        this.translating.set(false);
      },
      error: () => {
        // NLLB translator failed → fall back to Claude via optimizePrompt with
        // the EXCLUSIVE task of translating to the target language.
        this.translateWithClaudeFallback(text, targetLang);
      },
    });
  }

  /**
   * Translate via Claude (optimizePrompt) with the EXCLUSIVE task of
   * translating to the target language — used directly for Chinese targets and
   * as the fallback when the NLLB translator fails. Nothing is optimized or
   * restyled; structure, technical values and the [ImageN]/[VideoN]/[AudioN]
   * reference tags are preserved (tags stay in English, no spaces).
   */
  private translateWithClaudeFallback(text: string, targetLang: 'en' | 'es' | 'zh'): void {
    const langName =
      ({ en: 'English', es: 'Spanish', zh: 'Chinese' } as Record<string, string>)[targetLang] ??
      targetLang;
    const instruction =
      `Translate the following prompt to ${langName}. This is your ONLY task — ` +
      `do NOT optimize, rewrite, restyle, shorten or summarize it. Preserve the ` +
      `structure, section labels, technical values, and the [ImageN]/[VideoN]/[AudioN] ` +
      `reference tags exactly (keep the tags in English and write them with NO space, ` +
      `e.g. "[Image1]" not "[Image 1]"). Output only the translated prompt.`;

    const projectId = this.studio.projectId() || '';
    const sceneId = this.studio.sceneId() || '';
    const userName = this.session.user()?.handle || '';

    this.shotBuilder
      .optimizePrompt({
        projectId,
        sceneId,
        currentPrompt: text,
        userInstructions: instruction,
        userName,
      })
      .subscribe({
        next: (res) => {
          if (res.optimizedPrompt) {
            this.languageNotSupported.set(false);
            this.translatedText.set(res.optimizedPrompt);
            this.translationCache.set(targetLang, res.optimizedPrompt);
          } else {
            this.translatedText.set(this.i18n.instant('STUDIO.PROMPT.TRANSLATION_FAILED'));
          }
          this.translating.set(false);
        },
        error: () => {
          this.translatedText.set(this.i18n.instant('STUDIO.PROMPT.TRANSLATION_FAILED'));
          this.translating.set(false);
        },
      });
  }

  /**
   * Instant source-language guess. Only commits when confident:
   * - CJK → Chinese.
   * - Spanish-exclusive markers (ñ, inverted ¡¿) → Spanish. Shared accented
   *   vowels (é in the DCS section label "Mélange", "café", …) are deliberately
   *   NOT used — a single "é" would misfire on an English DCS prompt.
   * Everything else defaults to English (the app's dominant prompt language).
   */
  private detectSourceLang(text: string): 'en' | 'es' | 'zh' | '' {
    const sample = text.slice(0, 2000);
    if (/[一-鿿㐀-䶿豈-﫿぀-ヿ가-힯]/.test(sample)) {
      return 'zh';
    }
    if (/[ñÑ¿¡]/.test(sample)) {
      return 'es';
    }
    return 'en';
  }

  /** Show the translate popover anchored to the translate button. */
  protected showTranslatePopover(event: Event): void {
    this.translatePopRef.show(event);
  }

  /** Auto-show popover when cached translation is ready. */
  private openPopoverFromLang(): void {
    const btn = this.translateBtn?.nativeElement;
    if (btn) {
      const ev = new MouseEvent('click', { bubbles: true });
      this.translatePopRef.show(ev, btn);
    }
  }

  /**
   * Split text into blocks for batch translation. Breaks on newlines first
   * (preserving paragraph structure), then sub-divides any block longer
   * than 500 characters by sentence boundaries (`. `).
   */

  /** Apply the translated text: replace editor content with the translation. */
  protected applyTranslation(popover: Popover): void {
    const text = this.translatedText();
    if (!text) return;

    this.skipStoreSync = true;
    this.studio.setRawDescription(text);
    // Only here does the editor content actually become the target language,
    // so sourceLang is updated now (not in the translate response).
    this.sourceLang.set(this.translateLang());
    this.editorContent.set(text);
    this.translatedText.set(null);
    popover.hide();
  }

  /** PrimeIcons class for the chip representing each asset kind. */
  protected iconForKind(kind: UsedAssetKind): string {
    switch (kind) {
      case 'video':
        return 'pi-video';
      case 'audio':
        return 'pi-volume-up';
      case 'mixed':
        return 'pi-folder';
      default:
        return 'pi-image';
    }
  }

  /** Strip HTML tags to get plain text. */
  private stripHtml(html: string | null | undefined): string {
    return (html ?? '').replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Adds a reference to the prompt at the current cursor position.
   * If the editor has no selection (never focused), falls back to the end
   * of the document so the chip lands next to the last typed letter rather
   * than at position 0.
   */
  addReference(reference: string): void {
    const quill = this.editorRef.getQuill();
    const selection = quill.getSelection();
    // Quill always appends a trailing newline → length-1 is the end of content.
    const fallbackEnd = Math.max(0, quill.getLength() - 1);
    const cursorPosition = selection?.index ?? fallbackEnd;
    const text = ` [${reference}]`;
    quill.insertText(cursorPosition, text);
    quill.setSelection(cursorPosition + text.length, 0);
  }

  /**
   * Append a free-form text snippet (e.g. a cinematography preset's
   * `prompt` field) to the very end of the document, separated from the
   * previous word by a single space. Unlike `addReference`, this does NOT
   * follow the cursor — presets are meta-instructions for the model, so
   * they should always end up at the tail of the prompt regardless of
   * where the user happens to be editing.
   *
   * Empty or whitespace-only input is a no-op so a deselect path that
   * accidentally calls in with "" can't corrupt the editor.
   */
  appendText(snippet: string): void {
    const text = (snippet ?? '').trim();
    if (!text) return;
    if (!this.editorRef) return;
    const quill = this.editorRef.getQuill();
    if (!quill) return;
    // Length-1 strips Quill's trailing newline so the insert point is the
    // tail of the visible text, not the start of the next paragraph.
    const end = Math.max(0, quill.getLength() - 1);
    const existing = quill.getText(0, end);
    const needsSpace = existing.length > 0 && !/\s$/.test(existing);
    const payload = (needsSpace ? ' ' : '') + text;
    quill.insertText(end, payload);
    quill.setSelection(end + payload.length, 0);
  }

  /**
   * Remove the first occurrence of `snippet` from the editor, absorbing a
   * single leading space if present (mirrors how `appendText` adds one).
   * Used to revert a cinematography preset when the user deselects the
   * chip or swaps to a different one inside the same slot.
   *
   * If the user has manually edited the injected text the exact substring
   * won't match — we silently no-op rather than touch their edits.
   */
  removeText(snippet: string): void {
    const needle = (snippet ?? '').trim();
    if (!needle) return;
    if (!this.editorRef) return;
    const quill = this.editorRef.getQuill();
    if (!quill) return;
    const text = quill.getText();
    let index = text.indexOf(needle);
    if (index < 0) return;
    let length = needle.length;
    // Absorb a single space directly before the snippet so we don't
    // leave a stray gap behind. Skip when the match is at index 0
    // (no leading space could have been added in that case).
    if (index > 0 && text[index - 1] === ' ') {
      index -= 1;
      length += 1;
    }
    quill.deleteText(index, length);
    // Quill's text-change event normally syncs back to the store via
    // (onTextChange), but flag it explicitly in case the source path
    // is treated as `api` instead of `user`.
    this.skipStoreSync = true;
    this.studio.setRawDescription(quill.getText().replace(/\n+$/, ''));
  }

  /**
   * Atomic remove-then-append used when a cinematography slot's value
   * changes: the previous preset snippet is stripped, the new one
   * (if any) appended. Either field may be absent.
   */
  applyPresetChange(change: { remove?: string; add?: string }): void {
    if (change.remove) this.removeText(change.remove);
    if (change.add) this.appendText(change.add);
  }

  /**
   * Canonical lowercase label for a chip kind. Hardcoded (not translated)
   * because the token also ships to the model in the payload and must
   * match the frame hint vocabulary ("[Image1]", "[Video1]", "[Audio1]").
   */
  protected labelFor(kind: UsedAssetKind): 'image' | 'video' | 'audio' {
    if (kind === 'video') return 'video';
    if (kind === 'audio') return 'audio';
    return 'image';
  }

  /** Open the asset metadata popover for a reference chip. */
  protected openAssetInfo(event: Event, a: UsedAsset, index: number): void {
    this.assetInfoPopover.open(event, {
      id: a.fileId,
      name: a.name || a.filename,
      kind: a.kind,
      slot: a.slot || `[${this.labelFor(a.kind)}${this.assetNumbers().get(a.fileId) ?? index + 1}]`,
    });
  }

  // ── Replace a used resource (swap in another, keeping the slot) ─────────

  /** Used asset being replaced + the kind the replacement must stay compatible
   *  with (mixed chips replace with image/mixed resources). */
  protected readonly replaceTarget = signal<{ fileId: string; kind: UsedAssetKind } | null>(null);
  protected readonly replaceSearch = signal('');
  /** Which step of the chip popover is shown: the delete/replace menu or the
   *  resource picker (after choosing "Reemplazar"). */
  protected readonly replaceView = signal<'menu' | 'picker'>('menu');

  /** Asset-type tab active in the replace picker. */
  protected readonly replaceLibType = signal<AssetType>('character');

  protected readonly replaceTabs: { id: AssetType; labelKey: string }[] = [
    { id: 'character', labelKey: 'CHARACTERS.TABS.CHARACTER' },
    { id: 'location', labelKey: 'CHARACTERS.TABS.LOCATION' },
    { id: 'prop', labelKey: 'CHARACTERS.TABS.PROP' },
    { id: 'audio', labelKey: 'FILES.TABS.AUDIO' },
  ];

  @ViewChild('replacePopover') protected readonly replacePopover!: Popover;

  /** Library resources of the target kind (compatible with the chip's slot),
   *  with a linked file and not already used — grouped by asset type so the
   *  picker can browse character/location/prop/audio separately. Filtered by
   *  the replace search box. */
  protected readonly replaceByType = computed<Record<AssetType, ReplaceOption[]>>(() => {
    const target = this.replaceTarget();
    const buckets: Record<AssetType, ReplaceOption[]> = {
      character: [],
      location: [],
      prop: [],
      audio: [],
    };
    if (!target) return buckets;
    const query = this.replaceSearch().trim().toLowerCase();
    const usedFileIds = new Set(this.studio.usedAssets().map((a) => a.fileId));
    for (const item of this.chars.items()) {
      const c = item.character;
      if (!c?.id) continue;
      // The replace picker lists unassigned library ingredients here; the
      // episode-assigned resources live in the separate "From episode" section.
      if (this.studio.chapterCharacterIds().has(c.id)) continue;
      const metadata = parsePromptMetadata(c.metadata);
      const kind: UsedAssetKind = metadata.fileKind ?? 'image';
      if (kind !== target.kind && !(target.kind === 'image' && kind === 'mixed')) continue;
      if (query && !c.name.toLowerCase().includes(query)) continue;
      const file = item.files?.[0];
      if (!file || usedFileIds.has(file.file_id)) continue;
      const assetType: AssetType = metadata.assetType ?? 'character';
      (buckets[assetType] ?? buckets.character).push({
        id: c.id,
        name: c.name,
        fileId: file.file_id,
        kind,
        isCharacter: true,
      });
    }
    return buckets;
  });

  /** Resources already assigned to the episode (chapter characters + free
   *  assets) that can replace the chip's slot — a separate section so the
   *  user can swap in something the episode already carries, not just the
   *  unassigned library. Ordered by slot number (slot-less last). */
  protected readonly episodeReplaceOptions = computed<ReplaceOption[]>(() => {
    const target = this.replaceTarget();
    if (!target) return [];
    const query = this.replaceSearch().trim().toLowerCase();
    const usedFileIds = new Set(this.studio.usedAssets().map((a) => a.fileId));
    const out: ReplaceOption[] = [];
    for (const c of this.studio.chapterCharacterData()) {
      if (!c.fileId || usedFileIds.has(c.fileId)) continue;
      const kind = (c.kind === 'mixed' ? 'image' : c.kind) as UsedAssetKind;
      if (kind !== target.kind && !(target.kind === 'image' && kind === 'mixed')) continue;
      if (query && !c.name.toLowerCase().includes(query)) continue;
      out.push({
        id: c.id,
        name: c.name,
        fileId: c.fileId,
        kind,
        slot: c.slot,
        isCharacter: true,
      });
    }
    for (const a of this.studio.freeAssets()) {
      if (!a.id || usedFileIds.has(a.id)) continue;
      const kind = a.kind as UsedAssetKind;
      if (kind !== target.kind && !(target.kind === 'image' && kind === 'mixed')) continue;
      if (query && !a.filename.toLowerCase().includes(query)) continue;
      out.push({
        id: a.id,
        name: a.filename,
        fileId: a.id,
        kind,
        slot: this.studio.chapterAssetSlots().get(a.id) ?? '',
        isCharacter: false,
      });
    }
    return out.sort((x, y) => slotNum(x.slot) - slotNum(y.slot));
  });

  protected onReplaceSearch(event: Event): void {
    this.replaceSearch.set((event.target as HTMLInputElement).value);
  }

  /** Open the chip action menu (Borrar / Reemplazar) anchored at the chip. */
  protected openChipMenu(event: Event, a: UsedAsset): void {
    event.stopPropagation();
    this.replaceTarget.set({ fileId: a.fileId, kind: a.kind === 'mixed' ? 'image' : a.kind });
    this.replaceView.set('menu');
    this.replaceLibType.set('character');
    this.replaceSearch.set('');
    if (this.chars.items().length === 0 && !this.chars.loading()) {
      this.chars.load().subscribe();
    }
    this.replacePopover.toggle(event);
  }

  /** "Borrar": remove the resource and its slot token from the prompt. */
  protected onDeleteFromMenu(): void {
    const target = this.replaceTarget();
    if (!target) return;
    this.studio.unuseAsset(target.fileId);
    this.replaceTarget.set(null);
    this.replacePopover.hide();
  }

  /** "Reemplazar": switch the popover to the resource picker. */
  protected onGoReplace(): void {
    this.replaceView.set('picker');
  }

  /** Swap the chip's resource for the picked one — same position, so the
   *  [ImageN]/[VideoN]/[AudioN] slot number in the prompt stays valid. */
  protected pickReplacement(opt: ReplaceOption): void {
    const target = this.replaceTarget();
    if (!target) return;
    const old = this.studio.usedAssets().find((a) => a.fileId === target.fileId);
    this.studio.replaceUsedAsset(target.fileId, {
      fileId: opt.fileId,
      characterId: opt.isCharacter ? opt.id : '',
      name: opt.name,
      filename: opt.name,
      kind: opt.kind,
      slot: old?.slot,
    });
    this.replaceTarget.set(null);
    this.replacePopover.hide();
  }

  /** Capitalize a kind label for the canonical token form ("image" → "Image"). */
  private capLabel(label: 'image' | 'video' | 'audio'): string {
    return label[0].toUpperCase() + label.slice(1);
  }

  /**
   * Inserts a reference label whose number matches the chip the user just
   * picked from the library. The number comes from the shared assetNumbers
   * assignment (positional, in payload attachment order).
   */
  addReferenceForKind(kind: UsedAssetKind): void {
    const label = this.labelFor(kind);
    const list =
      kind === 'video'
        ? this.videoAssets()
        : kind === 'audio'
          ? this.audioAssets()
          : this.imageAssets();
    const last = list[list.length - 1];
    const number = last
      ? (this.assetNumbers().get(last.fileId) ?? this.nextFreeSlot(kind))
      : this.nextFreeSlot(kind);
    this.addReference(`${this.capLabel(label)}${number}`);
  }

  /** Next positional number for a kind = count of attached references + 1. */
  private nextFreeSlot(kind: UsedAssetKind): number {
    const refs = buildSlotReferences(
      this.studio.firstFrame(),
      this.studio.lastFrame(),
      this.studio.usedAssets(),
    );
    const k: 'image' | 'video' | 'audio' = kind === 'mixed' ? 'image' : kind;
    return refs.filter((r) => r.kind === k).length + 1;
  }

  /**
   * Remove every `[<Label>N]` token whose N is not one of the currently
   * assigned numbers (inherited slots + next-free fill). Iterates in reverse
   * so deletions don't shift the indices of earlier matches. Absorbs a single
   * leading space so we don't leave double spaces behind the way
   * `addReference` inserts them.
   */
  private pruneStaleTokens(label: 'image' | 'video' | 'audio', allowed: Set<number>): void {
    if (!this.editorRef) return;
    const quill = this.editorRef.getQuill();
    if (!quill) return;
    const text = quill.getText();
    const pattern = new RegExp(` ?\\[${this.capLabel(label)}(\\d+)\\]`, 'g');
    const stale: Array<{ index: number; length: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      if (!allowed.has(parseInt(m[1], 10))) {
        stale.push({ index: m.index, length: m[0].length });
      }
    }
    if (stale.length === 0) return;
    for (let i = stale.length - 1; i >= 0; i--) {
      quill.deleteText(stale[i].index, stale[i].length);
    }
    // Keep the store in sync — Quill's text-change event normally feeds
    // onTextChange, but we set the flag preemptively in case the event
    // path is suppressed for `api`-source edits.
    this.skipStoreSync = true;
    this.studio.setRawDescription(quill.getText().replace(/\n+$/, ''));
  }
}

/** One replaceable resource in the prompt-builder's replace picker. */
interface ReplaceOption {
  id: string;
  name: string;
  fileId: string;
  kind: UsedAssetKind;
  /** [ImageN]/[VideoN]/[AudioN] slot when the resource is already assigned to the episode. */
  slot?: string;
  /** True for chapter characters (characterId is meaningful); false for free assets. */
  isCharacter?: boolean;
}

/** Character metadata arrives from the wire as a JSON string; some surfaces
 *  store it already parsed. Handle both. */
function parsePromptMetadata(raw: string | null | undefined): CharacterMetadata {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as CharacterMetadata;
    } catch {
      return {};
    }
  }
  return raw as CharacterMetadata;
}

/** Extract the numeric part of an [ImageN]/[VideoN]/[AudioN] slot; 0 when absent. */
function slotNum(slot: string | undefined): number {
  if (!slot) return 0;
  const m = slot.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}
