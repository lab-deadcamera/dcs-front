import { Injectable, signal } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class ShotBuilderService {
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor(private readonly http: HttpClient) {}

  /**
   * Send a prompt + optional files to the Claude shot generator backend.
   * Returns the parsed shot list and raw response text.
   */
  generate(request: {
    projectId: string;
    sceneId: string;
    prompt: string;
    systemPrompt?: string;
    model?: string;
    userName?: string;
  }) {
    if (!request.sceneId || !request.projectId) {
      return of({
        shots: [],
        rawText: '',
      } as ShotBuilderResult).pipe(
        (source$) => {
          this.error.set('Select a scene before generating shots');
          return source$;
        },
      );
    }

    if (!request.prompt.trim()) {
      return of({
        shots: [],
        rawText: '',
      } as ShotBuilderResult).pipe(
        (source$) => {
          this.error.set('Write a prompt before generating shots');
          return source$;
        },
      );
    }

    this.loading.set(true);
    this.error.set(null);

    const body = {
      scene_id: request.sceneId,
      project_id: request.projectId,
      model: request.model || 'claude-shot-builder',
      prompt: request.prompt,
      system_prompt: request.systemPrompt || '',
      user_name: request.userName || '',
    };

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
          return this.parseResponse(response.data);
        }),
        catchError((err) => {
          const message =
            err?.error?.message || err?.message || 'Could not generate shot list';
          this.error.set(message);
          return of({ shots: [], rawText: '' } as ShotBuilderResult);
        }),
        finalize(() => this.loading.set(false)),
      );
  }

  /**
   * Decode the base64 data URI from the backend and parse the JSON shot list.
   */
  private parseResponse(data: {
    taskId: string;
    model: string;
    status: string;
    text?: string;
  }): ShotBuilderResult {
    const rawText = this.decodeText(data.text || '');
    const shots = this.extractShots(rawText);
    return { shots, rawText };
  }

  /**
   * Decode a data:text/plain;base64,... URI or plain text.
   */
  private decodeText(text: string): string {
    if (!text) return '';

    // data:text/plain;base64,<base64>
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

  /**
   * Try to parse a JSON shot list from Claude's response text.
   * Claude may wrap JSON in markdown fences or include commentary.
   */
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
      // Not direct JSON — try extracting from markdown fences
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
        // Malformed JSON inside fences
      }
    }

    // Failing that, try to extract any JSON-like array/object from the text
    const arrayMatch = text.match(/\{[\s\S]*"shots"[\s\S]*\}/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (parsed.shots && Array.isArray(parsed.shots)) {
          return parsed.shots as ShotBuilderShot[];
        }
      } catch {
        // Not parseable
      }
    }

    return [];
  }
}
