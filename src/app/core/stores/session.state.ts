import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SceneConfig, SessionUser, Take } from '../interfaces/session.models';
import { GeneratedClip } from '../interfaces/studio.models';
import { StudioStorageService } from './studio-storage.service';

/** Bump when the persisted shape changes; older snapshots are discarded. */
const SCHEMA_VERSION = 1;

/** Reasonable upper bound on takes; matches the checklist's vertical budget. */
const MAX_TAKES = 99;

interface SessionSnapshot {
  __v?: number;
  user: SessionUser | null;
  scene: SceneConfig | null;
  takes: Take[];
  currentTakeIndex: number;
}

/**
 * Scene-session state: identity, scene config, take list, and the cursor
 * pointing at the take currently being worked on.
 *
 * Persisted in IndexedDB via StudioStorageService — a reload restores the
 * exact state of the checklist so the user doesn't have to re-enter the
 * gate dialog mid-shoot.
 */
@Injectable({ providedIn: 'root' })
export class SessionStateService {
  private readonly storage = inject(StudioStorageService);
  private hydrated = false;

  private readonly _user = signal<SessionUser | null>(null);
  private readonly _scene = signal<SceneConfig | null>(null);
  private readonly _takes = signal<Take[]>([]);
  /** 0-based pointer into the `takes` array. */
  private readonly _currentTakeIndex = signal<number>(0);

  readonly user = this._user.asReadonly();
  readonly scene = this._scene.asReadonly();
  readonly takes = this._takes.asReadonly();
  readonly currentTakeIndex = this._currentTakeIndex.asReadonly();

  /** True once the gate has been submitted and a scene is loaded. */
  readonly isReady = computed(
    () => !!this._user() && !!this._scene() && this._takes().length > 0,
  );

  /** The take object the user is currently shooting (1-based `index`). */
  readonly currentTake = computed<Take | null>(
    () => this._takes()[this._currentTakeIndex()] ?? null,
  );

  /** Filename to use for the *next* clip generated against the current take. */
  readonly nextFilename = computed(() => {
    const take = this.currentTake();
    if (!take) return null;
    return this.buildFilename(take.index);
  });

  constructor() {
    this.hydrate();

    effect(() => {
      const snap: SessionSnapshot = {
        __v: SCHEMA_VERSION,
        user: this._user(),
        scene: this._scene(),
        takes: this._takes(),
        currentTakeIndex: this._currentTakeIndex(),
      };
      if (this.hydrated) {
        void this.storage.set('session', snap);
      }
    });
  }

  private async hydrate() {
    try {
      const snap = await this.storage.get<SessionSnapshot>('session');
      if (snap && snap.__v === SCHEMA_VERSION) {
        this._user.set(snap.user);
        this._scene.set(snap.scene);
        this._takes.set(snap.takes ?? []);
        this._currentTakeIndex.set(snap.currentTakeIndex ?? 0);
      }
    } finally {
      this.hydrated = true;
    }
  }

  /**
   * Replace the session with a fresh scene. Resets the take list to a
   * pristine pending sequence and points the cursor at take 1.
   */
  initSession(input: {
    email: string;
    handle: string;
    sceneCode: string;
    totalTakes: number;
  }): void {
    const total = Math.max(1, Math.min(MAX_TAKES, Math.round(input.totalTakes)));
    this._user.set({ email: input.email.trim(), handle: input.handle.trim() });
    this._scene.set({ code: input.sceneCode.trim(), totalTakes: total });
    this._takes.set(
      Array.from({ length: total }, (_, i) => ({
        index: i + 1,
        status: 'pending' as const,
      })),
    );
    this._currentTakeIndex.set(0);
  }

  /**
   * Toggle a take between `pending` and `done`. When marking pending →
   * done, advance the cursor to the next pending take (wrapping is not
   * needed — if every take is done, the cursor stays put). When marking
   * done → pending, the cursor jumps back to that take so the next
   * generation re-uses its filename.
   */
  toggleTake(takeIndex: number): void {
    const list = this._takes();
    const target = list.find((t) => t.index === takeIndex);
    if (!target) return;
    const willBeDone = target.status === 'pending';

    const next = list.map((t) =>
      t.index === takeIndex
        ? { ...t, status: willBeDone ? ('done' as const) : ('pending' as const) }
        : t,
    );
    this._takes.set(next);

    if (willBeDone) {
      const firstPending = next.findIndex((t) => t.status === 'pending');
      if (firstPending >= 0) this._currentTakeIndex.set(firstPending);
    } else {
      this._currentTakeIndex.set(next.findIndex((t) => t.index === takeIndex));
    }
  }

  /** Drop the session entirely — used when the user wants to start over. */
  reset(): void {
    this._user.set(null);
    this._scene.set(null);
    this._takes.set([]);
    this._currentTakeIndex.set(0);
  }

  /**
   * Filename for a clip belonging to `takeIndex`. Falls back to a generic
   * pattern when there's no active scene/user so legacy clips (recorded
   * before the gate was introduced) still download with a sensible name.
   */
  filenameForClip(clip: Pick<GeneratedClip, 'id' | 'takeIndex'>): string {
    if (clip.takeIndex !== undefined) return this.buildFilename(clip.takeIndex);
    return `clip-${clip.id}.mp4`;
  }

  private buildFilename(takeIndex: number): string {
    const scene = this._scene();
    const user = this._user();
    if (!scene || !user) return `clip-take${takeIndex}.mp4`;
    const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]+/g, '_');
    return `${safe(scene.code)}_T${takeIndex}_${safe(user.handle)}.mp4`;
  }
}
