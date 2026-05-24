import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CustomTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) { }

  getTranslation(lang: string): Observable<TranslationObject> {
    const path = `assets/i18n/${lang}.json`;
    return this.http.get<TranslationObject>(path).pipe(
      catchError((error) => {
        console.error(`Failed to load translation file: ${path}`, error);
        return throwError(() => error);
      }),
    );
  }
}
