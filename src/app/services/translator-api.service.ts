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
    source: string = 'en',
    block: boolean = false,
  ): Observable<TranslateResponse> {
    if (block) {
      const body: TranslateRequest = { q: text, source, target };
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
      const body: TranslateRequest = { q: text, source, target };
      return this.http.post<TranslateResponse>(`${this.apiUrl}/translate`, body);
    }
  }

  private replacePlaceHolder(text: string): string {
    return text
      .replace(/\[图片/g, '[Image')
      .replace(/\[视频/g, '[Video')
      .replace(/\[语音/g, '[Audio')
      .replace(/\[文档/g, '[Document');
  }

  private splitIntoBlocks(text: string): string[] {
    const MAX_LEN = 500;
    const blocks: string[] = [];
    const paragraphs = text.split('\n');

    for (const para of paragraphs) {
      if (!para) {
        blocks.push('');
        continue;
      }
      if (para.length <= MAX_LEN) {
        blocks.push(para);
      } else {
        const sentences = para.split(/(?<=[.!?])\s+/);
        let chunk = '';
        for (const sentence of sentences) {
          const candidate = chunk ? chunk + ' ' + sentence : sentence;
          if (candidate.length > MAX_LEN && chunk) {
            blocks.push(chunk);
            chunk = sentence;
          } else {
            chunk = candidate;
          }
        }
        if (chunk) blocks.push(chunk);
      }
    }

    return blocks;
  }
}
