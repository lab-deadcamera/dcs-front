import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environment/environment';
import { catchError, finalize, map, of, throwError } from 'rxjs';
import {
  AspectRatio,
  DirectorNotes,
  FlowSegment,
  Reference,
  RenderMode,
  Sequence,
  SequenceScene,
  Shot,
  ShotNotes,
} from '@app/core/interfaces';

/** A generated shot returned by the Claude shot builder. */
export interface ShotBuilderShot {
  number: number;
  name: string;
  description: string;
  /** Character/asset references from the Sequence format, if available. */
  references?: Reference[];
  /** The full prompt in 11-block DCS-DIRECTION format. */
  prompt_en?: string;
  /** Chinese prompt translation, when generate_zh was enabled. */
  prompt_zh?: string;
  /** Shot id (e.g. "A", "B") assigned by Claude within its scene. */
  id?: string;
  /** Cumulative start/end within the episode, in seconds. */
  start?: number;
  end?: number;
  /** Duration in seconds. */
  duration?: number;
  /** Per-shot notes (ingredients/warnings) from the SLIM response. */
  notes?: ShotNotes;
}

/** Episode-level asset assignment. */
export interface EpisodeAsset {
  slot: string;
  assetId: string;
  type: string;
}

/** Episode metadata. */
export interface EpisodeData {
  title?: string;
  totalDuration?: number;
  totalShots?: number;
  assetAssignments?: EpisodeAsset[];
}

/** Continuity tracking between scenes. */
export interface SceneContinuity {
  location: string;
  locationChange: boolean;
  timeContinuity: string;
  charactersPresent: string[];
  emotionalCarryover?: string;
  physicalCarryover?: string;
  wardrobeCarryover?: string;
  notes?: string[];
}

/** A scene parsed from the script (e.g., "56. INT. WYATT'S KITCHEN — DAY"). */
export interface SceneData {
  scriptNumber: number;
  scriptLocation: string;
  title: string;
  description: string;
  duration: number;
  start: number;
  end: number;
  sceneType: string;         // "present" | "flashback" | "fantasy" | ...
  mode: string;
  continuity: SceneContinuity;
  references: Reference[];
  shots: ShotBuilderShot[];
}

/** Parsed response from the Claude shot builder. */
export interface ShotBuilderResult {
  episode?: EpisodeData;
  scenes: SceneData[];
  rawText: string;
  /** One-line logline of the episode's core dramatic conflict. */
  description?: string;
  /** Total estimated duration in seconds. */
  duration?: number;
  /** Render mode, e.g. "M1". */
  mode?: string;
  /** Aspect ratio, e.g. "9:16". */
  aspectRatio?: string;
  /** Episode-wide director notes returned by Claude. */
  directorNotes?: DirectorNotes;
}

/** Scene context sent to Claude for both shot builder and proncer. */
export interface SceneContext {
  description?: string;
  characters?: Array<{ id?: string; name: string; description?: string; slot?: string }>;
  presets?: Array<{ code: string; label: string; prompt?: string }>;
  assets?: Array<{ id?: string; filename: string; mimeType: string }>;
}

/** Result from the proncer endpoint. */
export interface OptimizePromptResult {
  optimizedPrompt: string;
  suggestions: string[];
  changesMade: string[];
  rawText: string;
}

@Injectable({ providedIn: 'root' })
export class ShotBuilderService {
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor(private readonly http: HttpClient) {}

  readonly errorMessage = computed(() => this.error());

  /**
   * Send a prompt + optional files + scene context to the Claude shot generator.
   */
  generate(request: {
    projectId: string;
    sceneId: string;
    prompt: string;
    systemPrompt?: string;
    model?: string;
    skillID?: string;
    userName?: string;
    sceneContext?: SceneContext;
    generateZh?: boolean;
  }) {
    if (!request.projectId) {
      return of({ shots: [], scenes: [], rawText: '' } as ShotBuilderResult).pipe((source$) => {
        this.error.set('Select a project before generating shots');
        return source$;
      });
    }

    if (!request.prompt.trim()) {
      return of({ shots: [], scenes: [], rawText: '' } as ShotBuilderResult).pipe((source$) => {
        this.error.set('Write a prompt before generating shots');
        return source$;
      });
    }

    this.loading.set(true);
    this.error.set(null);

    const body: Record<string, unknown> = {
      scene_id: request.sceneId,
      project_id: request.projectId,
      model: 'claude-shot-builder',
      api_model: request.model || 'claude-sonnet-4-6',
      prompt: request.prompt,
      system_prompt: request.systemPrompt || '',
      skill_id: request.skillID || '',
      user_name: request.userName || '',
      generate_zh: request.generateZh !== false,
    };

    // Include scene context if provided
    if (request.sceneContext) {
      body['scene_context'] = {
        description: request.sceneContext.description,
        characters: request.sceneContext.characters,
        presets: request.sceneContext.presets,
        assets: request.sceneContext.assets,
      };
    }

    return this.http
      .post<{
        success: boolean;
        data?: { taskId: string; model: string; status: string; text?: string };
        message?: string;
      }>(`${environment.API_URL}/studio/text/claude/generate-shots`, body)
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to generate shots');
          }
          return this.parseShotsResponse(response.data);
        }),
        catchError((err) => {
          const message = err?.error?.message || err?.message || 'Could not generate shot list';
          this.error.set(message);
          return throwError(() => new Error(message));
        }),
        finalize(() => this.loading.set(false)),
      );
  }

  /**
   * Send a prompt to the Claude proncer endpoint for optimization.
   */
  optimizePrompt(request: {
    projectId: string;
    sceneId: string;
    currentPrompt: string;
    userInstructions?: string;
    model?: string;
    userName?: string;
    shotContext?: { shotName?: string; shotDescription?: string };
    sceneContext?: SceneContext;
  }) {
    if (!request.sceneId || !request.projectId) {
      return of({
        optimizedPrompt: '',
        suggestions: [],
        changesMade: [],
        rawText: '',
      } as OptimizePromptResult).pipe((source$) => {
        this.error.set('Select a scene before optimizing');
        return source$;
      });
    }

    if (!request.currentPrompt.trim()) {
      return of({
        optimizedPrompt: '',
        suggestions: [],
        changesMade: [],
        rawText: '',
      } as OptimizePromptResult).pipe((source$) => {
        this.error.set('Write a prompt before optimizing');
        return source$;
      });
    }

    this.loading.set(true);
    this.error.set(null);

    const body: Record<string, unknown> = {
      scene_id: request.sceneId,
      project_id: request.projectId,
      model: 'claude-shot-builder',
      api_model: request.model || 'claude-sonnet-4-6',
      current_prompt: request.currentPrompt,
      user_instructions: request.userInstructions || '',
      user_name: request.userName || '',
    };

    // Include optional context
    if (request.shotContext) {
      body['shot_context'] = request.shotContext;
    }
    if (request.sceneContext) {
      body['scene_context'] = {
        description: request.sceneContext.description,
        characters: request.sceneContext.characters,
        presets: request.sceneContext.presets,
        assets: request.sceneContext.assets,
      };
    }

    return this.http
      .post<{
        success: boolean;
        data?: {
          taskId: string;
          model: string;
          status: string;
          optimized_prompt?: string;
          suggestions?: string[];
          changes_made?: string[];
          raw_text?: string;
        };
        message?: string;
      }>(`${environment.API_URL}/studio/text/claude/optimize-prompt`, body)
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to optimize prompt');
          }
          return {
            optimizedPrompt: response.data.optimized_prompt || '',
            suggestions: response.data.suggestions || [],
            changesMade: response.data.changes_made || [],
            rawText: response.data.raw_text || '',
          } as OptimizePromptResult;
        }),
        catchError((err) => {
          const message = err?.error?.message || err?.message || 'Could not optimize prompt';
          this.error.set(message);
          return of({
            optimizedPrompt: '',
            suggestions: [],
            changesMade: [],
            rawText: '',
          } as OptimizePromptResult);
        }),
        finalize(() => this.loading.set(false)),
      );
  }

  /**
   * Create shot records in the backend from generated shot list.
   */
  materializeShots(request: {
    projectId: string;
    chapterId: string;
    sceneId: string;
    shots: ShotBuilderShot[];
  }) {
    if (!request.projectId || !request.chapterId || !request.sceneId) {
      return of([] as Array<{ id: string; number: number; name: string }>);
    }

    // Fire one POST per shot to the existing create-shot endpoint
    const observables = request.shots.map((shot) => {
      const body = {
        number: shot.number,
        name: shot.name,
        description: shot.description,
      };
      return this.http
        .post<{
          success: boolean;
          data?: { id: string; number: number; name: string };
          message?: string;
        }>(
          `${environment.API_URL}/projects/${request.projectId}/chapters/${request.chapterId}/scenes/${request.sceneId}/shots`,
          body,
        )
        .pipe(
          map((res) => {
            if (!res.success || !res.data) {
              throw new Error(res.message || 'Failed to create shot');
            }
            return res.data;
          }),
          catchError((err) => {
            console.error('Failed to materialize shot:', shot.name, err);
            return of(null);
          }),
        );
    });

    return of(null); // Placeholder — caller handles the actual parallel creation
    // In practice, the component will call this sequentially.
  }

  /**
   * Create a single shot record in the backend via POST.
   */
  createShot(
    projectId: string,
    chapterId: string,
    sceneId: string,
    payload: {
      number: number;
      name: string;
      description: string;
      aspect_ratio?: string;
      duration_seconds?: number;
    },
  ) {
    return this.http
      .post<{
        success: boolean;
        data?: { id: string };
        message?: string;
      }>(
        `${environment.API_URL}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots`,
        payload,
      )
      .pipe(
        catchError((err) => {
          console.error('Failed to create shot:', payload.name, err);
          return of({
            success: false,
            data: undefined,
            message: err?.error?.message || err?.message || 'Unknown error',
          });
        }),
      );
  }

  /**
   * Assign a character to a shot with an optional slot (@imageN).
   */
  assignCharacterToShot(
    projectId: string,
    chapterId: string,
    sceneId: string,
    shotId: string,
    characterId: string,
    slot?: string,
  ) {
    return this.http.post<{ success: boolean; data?: { id: string }; message?: string }>(
      `${environment.API_URL}/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}/shots/${shotId}/resources/characters`,
      { character_id: characterId, ...(slot ? { slot } : {}) },
    ).pipe(
      catchError((err) => {
        console.error('Failed to assign character to shot:', err);
        return of({ success: false, data: undefined, message: err?.error?.message || err?.message || 'Unknown error' });
      }),
    );
  }

  // ── Private helpers ───────────────────────────────────────────────

  private parseShotsResponse(data: {
    taskId: string;
    model: string;
    status: string;
    text?: string;
  }): ShotBuilderResult {
    const decoded = this.decodeText(data.text || '');
    if (!decoded) {
      return { scenes: [], rawText: '' };
    }

    // Defensive: extract only the outermost JSON object in case Claude
    // included text before or after the JSON.
    const raw = this.forceExtractJSON(decoded);

    // Try the new Episode → Scenes → Shots format (DCS-DIRECTION v2)
    try {
      const sanitized = this.sanitizeForJson(raw);
      const parsed = JSON.parse(sanitized);

      if (parsed.episode && parsed.scenes && Array.isArray(parsed.scenes)) {
        const scenes: SceneData[] = parsed.scenes.map((s: any) => ({
          scriptNumber: s.scriptNumber,
          scriptLocation: s.scriptLocation || '',
          title: s.title || '',
          description: s.description || '',
          duration: s.duration || 0,
          start: s.start || 0,
          end: s.end || 0,
          sceneType: s.sceneType || 'present',
          mode: s.mode || 'M1',
          continuity: {
            location: s.continuity?.location || s.scriptLocation || '',
            locationChange: s.continuity?.locationChange || false,
            timeContinuity: s.continuity?.timeContinuity || '',
            charactersPresent: s.continuity?.charactersPresent || [],
            emotionalCarryover: s.continuity?.emotionalCarryover,
            physicalCarryover: s.continuity?.physicalCarryover,
            wardrobeCarryover: s.continuity?.wardrobeCarryover,
            notes: s.continuity?.notes,
          },
          references: s.references || [],
          shots: (s.shots || []).map((shot: any, i: number) => ({
            // Shot number = its order within the scene (1, 2, 3…). The scene
            // number itself comes from the script (scriptNumber above).
            number: i + 1,
            id: shot.id,
            name: shot.title || '',
            description: shot.description || shot.prompt?.en || '',
            references: shot.references as Reference[] | undefined,
            prompt_en: shot.prompt?.en ? normalizeSeedanceSlots(shot.prompt.en) : undefined,
            prompt_zh: shot.prompt?.zh ? normalizeSeedanceSlots(shot.prompt.zh) : undefined,
            duration: shot.duration,
            start: shot.start,
            end: shot.end,
            notes: shot.notes as ShotNotes | undefined,
          }) as ShotBuilderShot),
        }));

        return {
          episode: parsed.episode,
          scenes,
          rawText: raw,
          description: parsed.description,
          duration: parsed.duration,
          mode: parsed.mode,
          aspectRatio: parsed.aspectRatio,
          directorNotes: parsed.directorNotes as DirectorNotes | undefined,
        };
      }
    } catch {
      // Not the new format — fall through to legacy parsing
    }

    // Try the legacy Sequence format (flat shots array)
    try {
      const sanitized = this.sanitizeForJson(raw);
      const parsed = JSON.parse(sanitized);
      if (parsed.shots && Array.isArray(parsed.shots) && parsed.description) {
        const legacyShots: ShotBuilderShot[] = parsed.shots.map((s: any, i: number) => ({
          number: i + 1,
          name: s.title || '',
          description: normalizeSeedanceSlots(s.prompt?.en) || s.prompt?.zh || '',
          references: s.references as Reference[] | undefined,
          prompt_en: s.prompt?.en ? normalizeSeedanceSlots(s.prompt.en) : undefined,
          duration: s.duration,
        }));
        // Wrap legacy shots in a single scene
        const scene: SceneData = {
          scriptNumber: 0,
          scriptLocation: parsed.description || '',
          title: parsed.description || '',
          description: parsed.description || '',
          duration: parsed.duration || 0,
          start: 0,
          end: parsed.duration || 0,
          sceneType: 'present',
          mode: parsed.mode || 'M1',
          continuity: {
            location: parsed.description || '',
            locationChange: false,
            timeContinuity: '',
            charactersPresent: [],
          },
          references: parsed.references || [],
          shots: legacyShots,
        };
        return { episode: parsed.episode, scenes: [scene], rawText: raw };
      }
    } catch {
      // Not parseable as rich format either
    }

    // Fallback: return raw decoded text
    return { scenes: [], rawText: raw };
  }

  /**
   * Repair JSON text so it always parses correctly, handling:
   *   - Smart/curly quotes (“ ” → ' ')
   *   - Unescaped ASCII " inside string values (e.g. Chinese dialogue
   *     like 他说"你好" → 他说'你好')
   *
   * Uses a character-by-character state machine so structural quotes
   * (the JSON delimiters) are preserved while content quotes are
   * replaced with single quotes.
   */
  private sanitizeForJson(text: string): string {
    // Phase 1: replace smart/curly double quotes (NOT standard ASCII ")
    let s = text.replace(/[“”]/g, "'");

    // Phase 2: walk character by character to catch unescaped ASCII "
    // that appears inside string values (a common Claude output error)
    const chars = [...s];
    const out: string[] = [];
    let inString = false;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];

      if (ch === '\\' && inString) {
        // Escape sequence — pass through as-is
        out.push(ch);
        if (i + 1 < chars.length) {
          out.push(chars[++i]);
        }
        continue;
      }

      if (ch === '"') {
        if (!inString) {
          // Opening delimiter
          inString = true;
          out.push(ch);
        } else {
          // We're inside a string — look ahead to decide if this
          // is the closing delimiter or content that should be replaced
          const rest = chars.slice(i + 1).join('').trimStart();
          const nextStructural = rest.match(/^[,:\]}]/);
          const atEnd = rest.length === 0 || rest.trim().length === 0;
          if (nextStructural || atEnd) {
            // Structural close
            inString = false;
            out.push(ch);
          } else {
            // Content quote — swap for single quote
            out.push("'");
          }
        }
      } else {
        out.push(ch);
      }
    }

    return out.join('');
  }

  private decodeText(text: string): string {
    if (!text) return '';

    // Decode data:text/plain;base64,...
    const base64Match = text.match(/^data:text\/plain;base64,(.+)$/);
    let decoded = text;
    if (base64Match) {
      try {
        decoded = atob(base64Match[1]);
      } catch {
        decoded = text;
      }
    }

    // Strip markdown fences if present (```json ... ```)
    const fenceMatch = decoded.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
      decoded = fenceMatch[1].trim();
    }

    return decoded;
  }

  /**
   * Extract the outermost balanced JSON object from text by walking braces.
   * This is a defensive fallback: if Claude includes text before or after
   * the JSON, we still extract just the JSON portion.
   */
  private forceExtractJSON(text: string): string {
    if (!text) return '';

    const start = text.indexOf('{');
    if (start < 0) return text;

    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') {
        depth++;
      } else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }

    return text;
  }

  private extractShots(text: string): ShotBuilderShot[] {
    if (!text) return [];

    const tryParse = (raw: string): ShotBuilderShot[] | null => {
      try {
        const parsed = JSON.parse(this.sanitizeForJson(raw));
        if (parsed.shots && Array.isArray(parsed.shots)) {
          return parsed.shots.map((s: any) => ({
            number: s.id ? s.id.charCodeAt(0) - 64 : 0,
            name: s.title || '',
            description: s.prompt || s.promptZh || '',
          }));
        }
        if (Array.isArray(parsed)) {
          return parsed as ShotBuilderShot[];
        }
      } catch {
        /* ignore */
      }
      return null;
    };

    // Try direct JSON parse
    const direct = tryParse(text);
    if (direct) return direct;

    // Look for ```json ... ``` block
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
      const fromFence = tryParse(fenceMatch[1].trim());
      if (fromFence) return fromFence;
    }

    // Try to extract any JSON with "shots" key
    const arrayMatch = text.match(/\{[\s\S]*"shots"[\s\S]*\}/);
    if (arrayMatch) {
      const fromExtract = tryParse(arrayMatch[0]);
      if (fromExtract) return fromExtract;
    }

    return [];
  }
}

/**
 * Normalize Seedance reference slots in a prompt from the bracketed
 * "[ImageN]" header the backend used to produce, to the "@imageN" slot format
 * the rest of the system uses (references, saved pre-prompts, the generator).
 * Idempotent — safe to apply to already-normalized text.
 */
export function normalizeSeedanceSlots(text: string | undefined | null): string {
  if (!text) return text ?? '';
  return text.replace(/\[image(\d+)\]/gi, '@image$1');
}

/**
 * Map a parsed ShotBuilderResult (Episode → Scenes → Shots) into the native
 * Sequence shape used by the shot-sequence-viewer (the SEEDANCE-style design).
 *
 * Returns null when there is nothing to render (no scenes or no shots), so the
 * caller falls back to the artifact / raw-text render paths.
 *
 * The backend SLIM response does not carry dramatic beats
 * (HOOK/FRICTION/SPIKE/BUTTON), so the time-budget strip is colored by scene
 * type instead — reusing the same palette as the panel's timeBudgetBar:
 * present → teal, flashback → amber, fantasy/dream → violet.
 */
export function shotBuilderResultToSequence(
  result: ShotBuilderResult,
  fallbackAspectRatio: AspectRatio = '9:16',
): Sequence | null {
  const scenes = result.scenes ?? [];
  const flat: Array<{ shot: ShotBuilderShot; sceneType: string; scriptNumber: number }> = [];
  for (const scene of scenes) {
    for (const shot of scene.shots ?? []) {
      flat.push({
        shot,
        sceneType: scene.sceneType || 'present',
        scriptNumber: scene.scriptNumber,
      });
    }
  }
  if (flat.length === 0) return null;

  const sceneColor = (type: string): string =>
    type === 'flashback'
      ? '#f59e0b'
      : type === 'fantasy' || type === 'dream'
        ? '#8b5cf6'
        : '#14b8a6';

  const totalDuration =
    result.duration ||
    result.episode?.totalDuration ||
    scenes.reduce((sum, s) => sum + (s.duration || 0), 0) ||
    flat.reduce((sum, f) => sum + (f.shot.duration || 0), 0);

  // Unique references aggregated by slot across scenes and shots.
  const refMap = new Map<string, Reference>();
  for (const scene of scenes) {
    for (const ref of scene.references ?? []) refMap.set(ref.slot, ref);
    for (const shot of scene.shots ?? []) {
      for (const ref of shot.references ?? []) refMap.set(ref.slot, ref);
    }
  }

  const mode = (result.mode as RenderMode) || 'M1';
  const aspectRatio = (result.aspectRatio as AspectRatio) || fallbackAspectRatio;

  // Unique shot ids across the whole sequence. Real responses carry per-scene
  // ids (e.g. "A", "B", "C") that restart in every scene, so a plain pass-through
  // would produce duplicate keys — approval, tracking and the summary all key by
  // shot id, so one approval would apply to every same-lettered shot. As a
  // STANDARD, every shot id is prefixed with its scene number ("89-A", "90-B",
  // "93-C") so it is globally unique AND reads as "scene · shot" in the summary;
  // a global S1, S2, … counter is the fallback when there is no id/scene number.
  const idFor = new Map<ShotBuilderShot, string>();
  const used = new Set<string>();
  let shotIndex = 0;
  for (const { shot, scriptNumber } of flat) {
    shotIndex++;
    const raw = shot.id || '';
    let id = `S${shotIndex}`;
    if (raw && scriptNumber) {
      const prefixed = raw.startsWith(`${scriptNumber}-`) ? raw : `${scriptNumber}-${raw}`;
      id = prefixed;
    } else if (raw && !used.has(raw)) {
      id = raw; // flat legacy list (single scene) — the letter is already unique
    }
    if (used.has(id)) id = `S${shotIndex}`;
    used.add(id);
    idFor.set(shot, id);
  }

  // Build the strip segments; fall back to a running cursor when the backend
  // did not include cumulative start/end timestamps.
  let cursor = 0;
  const segments: FlowSegment[] = flat.map(({ shot, sceneType }) => {
    const id = idFor.get(shot) as string;
    const start = shot.start ?? cursor;
    const end = shot.end ?? start + Math.max(1, shot.duration || 0);
    cursor = end;
    return {
      id,
      shotId: id,
      label: id,
      start,
      end,
      intensity: 0.5,
      color: sceneColor(sceneType),
    };
  });

  const shots: Shot[] = flat.map(({ shot }) => {
    const id = idFor.get(shot) as string;
    const start = shot.start ?? 0;
    const end = shot.end ?? start + Math.max(1, shot.duration || 0);
    return {
      id,
      title: shot.name || `Shot ${shot.number}`,
      description: shot.description,
      duration: shot.duration || 0,
      start,
      end,
      camera: { lens: '', framing: '', movement: '', fps: 24, shutter: '180°', aspectRatio },
      composition: {},
      blocking: {},
      acting: {},
      timeline: { duration: shot.duration || 0, segments: [], beats: [] },
      audio: {},
      references: shot.references ?? [],
      prompt: { en: shot.prompt_en || shot.description || '', zh: shot.prompt_zh },
      render: { mode, engine: 'Seedance' },
      notes: shot.notes ?? {},
    };
  });

  // Per-scene grouping so the viewer can render the shot cards inside a
  // per-scene accordion. shotIds reference the ids assigned above.
  const sequenceScenes: SequenceScene[] = scenes.map((scene) => ({
    scriptNumber: scene.scriptNumber,
    scriptLocation: scene.scriptLocation || '',
    title: scene.title,
    description: scene.description,
    duration: scene.duration || 0,
    sceneType: scene.sceneType || 'present',
    mode: scene.mode || mode,
    references: scene.references ?? [],
    shotIds: (scene.shots ?? []).map((shot) => idFor.get(shot) as string),
  }));

  const description =
    result.description ||
    result.episode?.title ||
    scenes[0]?.scriptLocation ||
    scenes[0]?.title ||
    'Shot list';

  return {
    description,
    duration: totalDuration,
    mode,
    aspectRatio,
    references: [...refMap.values()],
    sequenceFlow: {
      title: 'Presupuesto de tiempo',
      subtitle: 'La temperatura sube con el conflicto',
      duration: totalDuration,
      metric: 'dramaticIntensity',
      scale: { start: 'Frío', middle: 'Caliente', end: 'Vacío' },
      segments,
    },
    directorNotes: result.directorNotes,
    scenes: sequenceScenes,
    shots,
  };
}
