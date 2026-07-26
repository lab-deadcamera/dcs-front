import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environment/environment';
import { catchError, finalize, map, of, throwError } from 'rxjs';
import { parseArtifactData, computeCharacterCount } from './shot-builder-artifact';
import { Sequence, Reference } from '@app/core/interfaces';

/** A generated shot returned by the Claude shot builder. */
export interface ShotBuilderShot {
  number: number;
  name: string;
  description: string;
  /** Character/asset references from the Sequence format, if available. */
  references?: Reference[];
}

/** Parsed response from the Claude shot builder. */
export interface ShotBuilderResult {
  shots: ShotBuilderShot[];
  rawText: string;
  /** Parsed rich Sequence data, if the response was in the new rich format. */
  sequence?: Sequence;
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
    if (!request.sceneId || !request.projectId) {
      return of({ shots: [], rawText: '' } as ShotBuilderResult).pipe((source$) => {
        this.error.set('Select a scene before generating shots');
        return source$;
      });
    }

    if (!request.prompt.trim()) {
      return of({ shots: [], rawText: '' } as ShotBuilderResult).pipe((source$) => {
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
    const raw = this.decodeText(data.text || '');
    if (!raw) {
      return { shots: [], rawText: '' };
    }

    // Try the old ArtifactData format first
    const artifactData = parseArtifactData(raw);
    if (artifactData) {
      const shots: ShotBuilderShot[] = artifactData.shots.map((s, i) => ({
        number: i + 1,
        name: s.title || '',
        description: s.prompt || s.promptZh || '',
      }));
      return { shots, rawText: JSON.stringify(artifactData) };
    }

    // Try the new rich Sequence format
    try {
      const sanitized = this.sanitizeForJson(raw);
      const parsed = JSON.parse(sanitized);
      if (parsed.shots && Array.isArray(parsed.shots) && parsed.description) {
        const seq = computeCharacterCount(parsed as Sequence);
        const shots: ShotBuilderShot[] = parsed.shots.map((s: any, i: number) => ({
          number: i + 1,
          name: s.title || '',
          description: s.prompt?.en || s.prompt?.zh || '',
          references: s.references as Reference[] | undefined,
        }));
        return { shots, rawText: raw, sequence: seq };
      }
    } catch {
      // Not parseable as rich format either
    }

    // Fallback: return raw decoded text
    return { shots: [], rawText: raw };
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
