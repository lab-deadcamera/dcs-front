import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '@environment/environment';

export interface TranslateResponse {
  translatedText: string;
  detectedLanguage: { language: string; confidence: number };
}

export interface TranslateRequest {
  q: string;
  source: string;
  target: string;
}

export interface TranslateBlocksRequest {
  blocks: string[];
  source: string;
  target: string;
}

export interface TranslateBlocksResponse {
  translations: string[];
  detectedLanguage: { language: string; confidence: number };
}

@Injectable({ providedIn: 'root' })
export class TranslatorApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.TRANSLATOR_URL;

  translate(
    text: string,
    target: string,
    source: string = 'auto',
    block: boolean = false,
  ): Observable<TranslateResponse> {
    // '' (unknown source) must never reach the backend — it raises
    // "Idioma no soportado". Fall back to 'auto' so the backend's fasttext
    // detector resolves the language and returns detectedLanguage.
    const src = source || 'auto';
    if (block) {
      const body: TranslateBlocksRequest = {
        blocks: this.splitIntoBlocks(text),
        source: src,
        target,
      };
      return this.http.post<TranslateResponse>(`${this.apiUrl}/translate-blocks`, body).pipe(
        map((response) => {
          const res = response as unknown as TranslateBlocksResponse;
          const translated = res.translations.map((t) => this.replacePlaceHolder(t)).join('\n');
          // NLLB (600M distilled) is weak on long structured prompts: it can
          // "succeed" with runaway repetition, lost reference tags, or heavy
          // truncation. Route those to the Claude fallback like any failure.
          if (this.isGarbageTranslation(text, translated)) {
            throw new Error('NLLB returned a degraded translation');
          }
          return {
            translatedText: translated,
            detectedLanguage: response.detectedLanguage,
          };
        }),
      );
    } else {
      const body: TranslateRequest = { q: text, source: src, target };
      return this.http.post<TranslateResponse>(`${this.apiUrl}/translate`, body).pipe(
        map((res) => {
          if (this.isGarbageTranslation(text, res.translatedText)) {
            throw new Error('NLLB returned a degraded translation');
          }
          return res;
        }),
      );
    }
  }

  private replacePlaceHolder(text: string): string {
    return text
      .replace(/\[图像/g, '[Image')
      .replace(/\[图片/g, '[Image')
      .replace(/\[视频/g, '[Video')
      .replace(/\[语音/g, '[Audio')
      .replace(/\[文档/g, '[Document');
  }

  /** Reference tags that must survive a translation round-trip. */
  private readonly SLOT_RE = /\[(?:Image|Video|Audio)\d+\]|@(?:image|video|audio)\d+/gi;

  /**
   * Heuristic quality gate for NLLB output. NLLB-200-distilled-600M can return
   * HTTP 200 while producing garbage: runaway tag repetition, dropping most
   * reference tags, generic repetition loops, or heavy truncation. When any of
   * those is detected the call is treated as failed so the caller falls back
   * to Claude.
   */
  private isGarbageTranslation(source: string, translated: string): boolean {
    if (!translated || !translated.trim()) return true;

    const srcCounts = new Map<string, number>();
    for (const t of source.match(this.SLOT_RE) ?? []) {
      srcCounts.set(t, (srcCounts.get(t) ?? 0) + 1);
    }
    const outCounts = new Map<string, number>();
    for (const t of translated.match(this.SLOT_RE) ?? []) {
      outCounts.set(t, (outCounts.get(t) ?? 0) + 1);
    }

    // Runaway repetition: a tag inflated far beyond its count in the source
    // (e.g. "[Image3]" appears 4× in the source but 30× in the output). Using
    // a per-tag ratio (not an absolute cap) avoids rejecting legitimate long
    // multi-shot prompts that genuinely reference a character many times.
    for (const [tag, outCount] of outCounts) {
      const srcCount = srcCounts.get(tag) ?? 0;
      if (outCount > Math.max(srcCount * 2.5, 6)) {
        return true;
      }
    }

    // The output should keep (roughly) the input's reference tags.
    const sourceTags = source.match(this.SLOT_RE) ?? [];
    const resultTags = translated.match(this.SLOT_RE) ?? [];
    if (sourceTags.length > 0 && resultTags.length < sourceTags.length * 0.5) {
      return true;
    }

    // Heavy truncation.
    if (translated.length < source.length * 0.25) {
      return true;
    }

    return false;
  }

  private splitIntoBlocks(text: string): string[] {
    return (
      text
        // dividir por '.' o salto de línea
        .split(/[\.\n]+/)
        // limpiar espacios sobrantes
        .map((block) => block.trim())
        // filtrar vacíos
        .filter((block) => block.length > 0)
    );
  }
}
