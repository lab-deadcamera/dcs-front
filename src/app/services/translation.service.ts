import { effect, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type SupportedLanguage = 'en' | 'es';

const STORAGE_KEY = 'dcs-language';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private translate = inject(TranslateService);

  readonly availableLanguages: SupportedLanguage[] = ['en', 'es'];
  readonly currentLanguage = signal<SupportedLanguage>(this.#resolveInitialLanguage());

  constructor() {
    this.translate.addLangs(this.availableLanguages);
    this.translate.setFallbackLang('en');
    this.translate.use(this.currentLanguage());

    effect(() => {
      const lang = this.currentLanguage();
      this.translate.use(lang);
      localStorage.setItem(STORAGE_KEY, lang);
    });
  }

  setLanguage(lang: SupportedLanguage): void {
    this.currentLanguage.set(lang);
  }

  #resolveInitialLanguage(): SupportedLanguage {
    const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (stored && this.availableLanguages.includes(stored)) return stored;

    const browserLang = this.translate.getBrowserLang() as SupportedLanguage | undefined;
    if (browserLang && this.availableLanguages.includes(browserLang)) return browserLang;

    return 'en';
  }

  get(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  get$(key: string, params?: Record<string, unknown>) {
    return this.translate.get(key, params);
  }
}
