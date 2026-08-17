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
          const translated = res.translations.map((t) => this.replacePlaceHolder(t));
          return {
            translatedText: translated.join('\n'),
            detectedLanguage: response.detectedLanguage,
          };
        }),
      );
    } else {
      const body: TranslateRequest = { q: text, source: src, target };
      return this.http.post<TranslateResponse>(`${this.apiUrl}/translate`, body);
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
