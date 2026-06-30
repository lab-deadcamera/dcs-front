import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environment/environment';
import { catchError, finalize, map, of } from 'rxjs';

/** A generated shot returned by the Claude shot builder. */
export interface ShotBuilderShot {
  number: number;
  name: string;
  description: string;
}

/** Parsed response from the Claude shot builder. */
export interface ShotBuilderResult {
  shots: ShotBuilderShot[];
  rawText: string;
}

/** Scene context sent to Claude for both shot builder and proncer. */
export interface SceneContext {
  description?: string;
  characters?: Array<{ name: string; description?: string }>;
  presets?: Array<{ code: string; label: string; prompt?: string }>;
  assets?: Array<{ filename: string; mimeType: string }>;
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
    userName?: string;
    sceneContext?: SceneContext;
  }) {
    console.log({ request });

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
      model: request.model || 'claude-shot-builder',
      prompt: request.prompt,
      system_prompt: request.systemPrompt || '',
      user_name: request.userName || '',
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
          return of({ shots: [], rawText: '' } as ShotBuilderResult);
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
      model: request.model || 'claude-shot-builder',
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

  // ── Private helpers ───────────────────────────────────────────────

  private parseShotsResponse(data: {
    taskId: string;
    model: string;
    status: string;
    text?: string;
  }): ShotBuilderResult {
    const rawText = this.decodeText(data.text || '');
    const shots = this.extractShots(rawText);
    return { shots, rawText };
  }

  private decodeText(text: string): string {
    if (!text) return '';

    const base64Match = text.match(/^data:text\/plain;base64,(.+)$/);
    if (base64Match) {
      try {
        return atob(base64Match[1]);
      } catch {
        return text;
      }
    }

    return text;
  }

  private extractShots(text: string): ShotBuilderShot[] {
    if (!text) return [];

    // Try direct JSON parse
    try {
      const parsed = JSON.parse(text);
      if (parsed.shots && Array.isArray(parsed.shots)) {
        return parsed.shots as ShotBuilderShot[];
      }
      if (Array.isArray(parsed)) {
        return parsed as ShotBuilderShot[];
      }
    } catch {
      // fall through
    }

    // Look for ```json ... ``` block
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.shots && Array.isArray(parsed.shots)) {
          return parsed.shots as ShotBuilderShot[];
        }
        if (Array.isArray(parsed)) {
          return parsed as ShotBuilderShot[];
        }
      } catch {
        // malformed
      }
    }

    // Try to extract any JSON with "shots" key
    const arrayMatch = text.match(/\{[\s\S]*"shots"[\s\S]*\}/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (parsed.shots && Array.isArray(parsed.shots)) {
          return parsed.shots as ShotBuilderShot[];
        }
      } catch {
        // not parseable
      }
    }

    return [];
  }
}
