import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { StudioStorageService } from './studio-storage.service';
import { AuthUser, LoginResponse, SessionUser, UserRole } from '../interfaces/session.models';
import { COLOR_PALETTES, ColorPalette, applyThemePalette } from '../theme/theme-colors';

export type SupportedLanguage = 'en' | 'es';

const SCHEMA_VERSION = 2;

interface SessionSnapshot {
  __v: number;
  user: SessionUser | null;
  authUser: AuthUser | null;
  token: string | null;
  language: SupportedLanguage;
  mode: 'light' | 'dark';
  primaryName: string;
  secondaryName: string;
  accentName: string;
}

function resolveInitialLanguage(translate: TranslateService): SupportedLanguage {
  const stored = localStorage.getItem('dcs-language') as SupportedLanguage | null;
  if (stored && (stored === 'en' || stored === 'es')) return stored;
  const browserLang = translate.getBrowserLang() as SupportedLanguage | undefined;
  if (browserLang && (browserLang === 'en' || browserLang === 'es')) return browserLang;
  return 'en';
}

function readStoredState(): Partial<SessionSnapshot> {
  try {
    const raw = localStorage.getItem('dcs-theme');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode ?? 'light',
        primaryName: parsed.primary ?? 'blue',
        secondaryName: parsed.secondary ?? 'purple',
        accentName: parsed.accent ?? 'amber',
      };
    }
  } catch {
    /* ignore */
  }
  return {};
}

function findPalette(name: string): ColorPalette {
  return COLOR_PALETTES.find((p) => p.name === name) ?? COLOR_PALETTES[0];
}

/**
 * Session & preferences store.
 *
 * Holds user identity (email, handle, auth token), UI language, and theme
 * palette (mode + 3 accent colors). Everything here is "who the user is and
 * how they like the app to look" — persisted across sessions and restored on
 * reload via IndexedDB.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly storage = inject(StudioStorageService);
  private readonly translate = inject(TranslateService);
  private hydrated = false;

  private readonly router = inject(Router);

  private readonly _user = signal<SessionUser | null>(null);
  private readonly _authUser = signal<AuthUser | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _language = signal<SupportedLanguage>('en');
  private readonly _mode = signal<'light' | 'dark'>('light');
  private readonly _primaryName = signal<string>('blue');
  private readonly _secondaryName = signal<string>('purple');
  private readonly _accentName = signal<string>('amber');
  private readonly _primaryPalette = signal<ColorPalette>(COLOR_PALETTES[0]);
  private readonly _secondaryPalette = signal<ColorPalette>(COLOR_PALETTES[3]);
  private readonly _accentPalette = signal<ColorPalette>(COLOR_PALETTES[8]);

  readonly user = this._user.asReadonly();
  readonly authUser = this._authUser.asReadonly();
  readonly token = this._token.asReadonly();
  readonly language = this._language.asReadonly();
  readonly mode = this._mode.asReadonly();
  readonly primaryName = this._primaryName.asReadonly();
  readonly secondaryName = this._secondaryName.asReadonly();
  readonly accentName = this._accentName.asReadonly();
  readonly primaryPalette = this._primaryPalette.asReadonly();
  readonly secondaryPalette = this._secondaryPalette.asReadonly();
  readonly accentPalette = this._accentPalette.asReadonly();
  readonly palettes = COLOR_PALETTES;

  readonly availableLanguages: SupportedLanguage[] = ['en', 'es'];
  readonly isAuthenticated = computed(() => this._token() !== null);

  /** Current user's role, if authenticated. */
  readonly role = computed<UserRole | null>(() => this._authUser()?.role ?? null);
  /** User's role level (higher = fewer privileges). -1 if not authenticated. */
  readonly roleLevel = computed(() => this.role()?.level ?? -1);

  constructor() {
    // Configure available languages first
    this.translate.addLangs(this.availableLanguages);
    this.translate.setFallbackLang('en');

    // Lectura síncrona del token desde localStorage para que el authGuard
    // pueda validar la sesión inmediatamente, sin esperar la hidratación
    // async desde IndexedDB.
    const storedToken = localStorage.getItem('dcs-token');
    if (storedToken) {
      this._token.set(storedToken);
    }

    // Determine initial language synchronously before hydration
    const initialLang = resolveInitialLanguage(this.translate);
    this._language.set(initialLang);
    this.translate.use(initialLang);

    this.hydrate();

    effect(() => {
      const lang = this._language();
      this.translate.use(lang);
      localStorage.setItem('dcs-language', lang);
    });

    effect(() => {
      const snap: SessionSnapshot = {
        __v: SCHEMA_VERSION,
        user: this._user(),
        authUser: this._authUser(),
        token: this._token(),
        language: this._language(),
        mode: this._mode(),
        primaryName: this._primaryName(),
        secondaryName: this._secondaryName(),
        accentName: this._accentName(),
      };
      if (this.hydrated) {
        void this.storage.set('session', snap);
      }
    });

    effect(() => {
      applyThemePalette(
        this._primaryPalette(),
        this._secondaryPalette(),
        this._accentPalette(),
        this._mode(),
      );
      localStorage.setItem(
        'dcs-theme',
        JSON.stringify({
          mode: this._mode(),
          primary: this._primaryName(),
          secondary: this._secondaryName(),
          accent: this._accentName(),
        }),
      );
    });
  }

  private async hydrate() {
    try {
      const storedTheme = readStoredState();
      const snap = await this.storage.get<SessionSnapshot>('session');
      if (snap && snap.__v === SCHEMA_VERSION) {
        this._user.set(snap.user);
        this._authUser.set(snap.authUser);
        this._token.set(snap.token);
        this._language.set(snap.language ?? resolveInitialLanguage(this.translate));
        this._mode.set(snap.mode ?? storedTheme.mode ?? 'light');
        this._primaryName.set(snap.primaryName ?? storedTheme.primaryName ?? 'blue');
        this._secondaryName.set(snap.secondaryName ?? storedTheme.secondaryName ?? 'purple');
        this._accentName.set(snap.accentName ?? storedTheme.accentName ?? 'amber');
      } else {
        this._language.set(resolveInitialLanguage(this.translate));
        this._mode.set((storedTheme.mode as 'light' | 'dark') ?? 'light');
        this._primaryName.set(storedTheme.primaryName ?? 'blue');
        this._secondaryName.set(storedTheme.secondaryName ?? 'purple');
        this._accentName.set(storedTheme.accentName ?? 'amber');
      }
    } finally {
      this._primaryPalette.set(findPalette(this._primaryName()));
      this._secondaryPalette.set(findPalette(this._secondaryName()));
      this._accentPalette.set(findPalette(this._accentName()));
      this.hydrated = true;
    }
  }

  setUser(user: SessionUser | null) {
    this._user.set(user);
  }
  setToken(token: string | null) {
    this._token.set(token);
  }

  initSession(input: { email: string; handle: string }) {
    this._user.set({ email: input.email.trim(), handle: input.handle.trim() });
  }

  /** Store full auth response (token + user profile with role). */
  login(response: LoginResponse) {
    this._token.set(response.token);
    this._authUser.set(response.user);
    this._user.set({
      email: response.user.email,
      handle: response.user.user_name || response.user.username,
    });
    localStorage.setItem('dcs-token', response.token);
  }

  /** Clear all auth state except language and redirect to logout. */
  logout() {
    this._token.set(null);
    this._authUser.set(null);
    this._user.set(null);
    localStorage.removeItem('dcs-token');
    void this.storage.delete('session');
  }

  reset() {
    this._user.set(null);
    this._token.set(null);
    this._authUser.set(null);
    localStorage.removeItem('dcs-token');
  }

  setLanguage(lang: SupportedLanguage) {
    this._language.set(lang);
  }
  get(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }
  get$(key: string, params?: Record<string, unknown>) {
    return this.translate.get(key, params);
  }

  setMode(mode: 'light' | 'dark') {
    this._mode.set(mode);
  }
  toggleMode() {
    this._mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }
  setPrimary(name: string) {
    this._primaryName.set(name);
    this._primaryPalette.set(findPalette(name));
  }
  setSecondary(name: string) {
    this._secondaryName.set(name);
    this._secondaryPalette.set(findPalette(name));
  }
  setAccent(name: string) {
    this._accentName.set(name);
    this._accentPalette.set(findPalette(name));
  }
}
