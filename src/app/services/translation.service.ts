import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type SupportedLanguage = 'en' | 'es';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private translate = inject(TranslateService);

  readonly currentLanguage = signal<SupportedLanguage>('es');
  readonly availableLanguages: SupportedLanguage[] = ['en', 'es'];

  constructor() {
    const browserLang = this.translate.getBrowserLang() as SupportedLanguage | undefined;
    const defaultLang = browserLang && this.availableLanguages.includes(browserLang) ? browserLang : 'es';

    this.translate.addLangs(this.availableLanguages);
    this.translate.setFallbackLang('es');
    this.translate.use(defaultLang);
    this.currentLanguage.set(defaultLang);
  }

  setLanguage(lang: SupportedLanguage): void {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
  }

  get(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  get$(key: string, params?: Record<string, unknown>) {
    return this.translate.get(key, params);
  }
}
