import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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

  translate(text: string, target: string): Observable<TranslateResponse> {
    const body: TranslateRequest = { q: text, source: 'auto', target };
    return this.http.post<TranslateResponse>(`${this.apiUrl}/translate`, body);
  }

  translateBlocks(
    blocks: string[],
    target: string,
    source: string = 'auto',
  ): Observable<TranslateBlocksResponse> {
    const body: TranslateBlocksRequest = { blocks, source, target };
    return this.http.post<TranslateBlocksResponse>(`${this.apiUrl}/translate-blocks`, body);
  }
}
