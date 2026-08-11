import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { SkillBrief } from '@app/core/interfaces/studio.models';
import { PresetsService } from './presets.service';
import { Take } from '../interfaces/session.models';
import { ProjectsApiService } from '@modules/projects/projects/services';
import {
  CinematographyConfig,
  GeneratedClip,
  MAX_BATCH_COUNT,
  OutputFormatConfig,
  PendingGeneration,
  PROMPT_TEMPLATE,
  ReferenceAsset,
  UsedAsset,
  UsedAssetKind,
} from '../interfaces/studio.models';
import { ModelData } from '../interfaces';
import { collectSlotTokensInOrder } from '../utils/slot-reindex';

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// ─── Preset-into-section injection helpers ─────────────────────────

const PRESET_SECTION_TARGETS = {
  lens: 'POSE:',
  cameraBody: 'POSE:',
  cameraMotion: 'POSE:',
  colorGrading: 'ENVIRONMENT AND LIGHTING:',
  genre: 'ENVIRONMENT AND LIGHTING:',
} as const;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Reasonable upper bound on takes. */
const MAX_TAKES = 99;

/**
 * Unified studio store — no persistent memory.
 *
 * Every property resets to its default on page load. All project/scene/shot
 * data must be loaded from the backend by the consumer (IndexStudio).
 */
@Injectable({ providedIn: 'root' })
export class StudioStore {
  private readonly presets = inject(PresetsService);
  private readonly projectsApi = inject(ProjectsApiService);

  // ── Core session/project state ───────────────────────────────────
  private readonly _projectId = signal<string | null>(null);
  private readonly _chapterId = signal<string | null>(null);
  private readonly _sceneId = signal<string | null>(null);
  private readonly _shotId = signal<string | null>(null);
  private readonly _sceneCode = signal<string>('');
  private readonly _projectName = signal<string>('');
  private readonly _chapterName = signal<string>('');
  private readonly _sceneName = signal<string>('');
  private readonly _shotName = signal<string>('');
  readonly projectName = this._projectName.asReadonly();
  readonly chapterName = this._chapterName.asReadonly();
  readonly sceneName = this._sceneName.asReadonly();
  readonly shotName = this._shotName.asReadonly();
  private readonly _userHandle = signal<string>('');
  private readonly _isReady = signal<boolean>(false);

  readonly projectId = this._projectId.asReadonly();
  readonly chapterId = this._chapterId.asReadonly();
  readonly sceneId = this._sceneId.asReadonly();
  readonly shotId = this._shotId.asReadonly();
  readonly sceneCode = this._sceneCode.asReadonly();
  readonly isReady = this._isReady.asReadonly();

  // ── Takes ────────────────────────────────────────────────────────

  // Chapter (episode) assignment filters
  private readonly _chapterPresetIds = signal<Set<string>>(new Set());
  private readonly _chapterCharacterIds = signal<Set<string>>(new Set());
  private readonly _chapterAssetIds = signal<Set<string>>(new Set());
  private readonly _chapterCharacterData = signal<
    Array<{ id: string; name: string; slot: string; fileId: string; kind: string }>
  >([]);
  /** fileId → [ImageN] slot inherited from the chapter assignment for assets
   *  (locations/props/audio). Characters keep their slot in chapterCharacterData. */
  private readonly _chapterAssetSlots = signal<Map<string, string>>(new Map());
  /** fileId → chapter_assets row id, required to unassign an episode asset. */
  private readonly _chapterAssetAssignmentIds = signal<Map<string, string>>(new Map());

  readonly chapterPresetIds = this._chapterPresetIds.asReadonly();
  readonly chapterCharacterIds = this._chapterCharacterIds.asReadonly();
  readonly chapterAssetIds = this._chapterAssetIds.asReadonly();
  readonly chapterCharacterData = this._chapterCharacterData.asReadonly();
  readonly chapterAssetSlots = this._chapterAssetSlots.asReadonly();
  readonly chapterAssetAssignmentIds = this._chapterAssetAssignmentIds.asReadonly();

  /** True after setChapterAssignments has been called at least once (even if
   *  the response contained null/empty arrays). Used by child components
   *  to distinguish "no assignments loaded yet" from "loaded but empty". */
  private readonly _assignmentsLoaded = signal(false);
  readonly assignmentsLoaded = this._assignmentsLoaded.asReadonly();

  /**
   * Scan the shot's pre-prompt description for [Image{N}], [Video{N}], [Audio{N}]
   * tokens and auto-register the matching chapter resources (characters first,
   * then chapter assets) as used assets.
   *
   * Tokens are processed in ORDER OF FIRST APPEARANCE in the prompt — that
   * order drives the positional slot reindex, so it must match the order in
   * which the reference items get attached to the payload.
   */
  registerUsedAssetsFromDescription(description: string): void {
    if (!description) return;

    const tokens = collectSlotTokensInOrder(description);
    if (tokens.length === 0) return;

    // REPLACE, not accumulate: this is the authoritative registration of the
    // assets referenced by THIS description. Even if called twice (both async
    // load paths) or with a stale original, the last call wins and the final
    // set is exactly the referenced assets.
    this._usedAssets.set([]);

    // Lookup slot → character (chapter assignments carry slot + fileId).
    const slotToChar = new Map<
      string,
      { id: string; name: string; slot: string; fileId: string }
    >();
    for (const c of this._chapterCharacterData()) {
      if (c.slot) slotToChar.set(c.slot.toLowerCase(), c);
    }

    // Lookup slot → chapter asset (free asset that inherited an [ImageN] slot).
    const slotToAsset = new Map<
      string,
      { fileId: string; filename: string; kind: 'image' | 'video' | 'audio' }
    >();
    for (const a of this._freeAssets()) {
      const slot = this._chapterAssetSlots().get(a.id);
      if (slot) slotToAsset.set(slot.toLowerCase(), { fileId: a.id, filename: a.filename, kind: a.kind });
    }

    for (const token of tokens) {
      const m = token.match(/^\[(image|video|audio)(\d+)\]$/);
      if (!m) continue;
      const kind = m[1] === 'video' ? 'video' : m[1] === 'audio' ? 'audio' : 'image';

      const char = slotToChar.get(token);
      if (char && char.fileId) {
        this.useAsset({
          fileId: char.fileId,
          characterId: char.id,
          name: char.name,
          filename: char.name,
          kind,
          slot: char.slot || token,
        });
        continue;
      }

      const asset = slotToAsset.get(token);
      if (asset && asset.kind === kind) {
        this.useAsset({
          fileId: asset.fileId,
          characterId: '',
          name: asset.filename,
          filename: asset.filename,
          kind,
          slot: token,
        });
      }
    }
  }

  private readonly _takes = signal<Take[]>([]);
  private readonly _currentTakeIndex = signal<number>(0);

  readonly takes = this._takes.asReadonly();
  readonly currentTakeIndex = this._currentTakeIndex.asReadonly();

  readonly currentTake = computed<Take | null>(
    () => this._takes()[this._currentTakeIndex()] ?? null,
  );

  readonly currentTakeHasVideo = computed(() => {
    const take = this.currentTake();
    return !!take?.video_url;
  });

  readonly activeTakes = computed(() => this._takes().filter((t) => t.active !== false));

  readonly discardedTakes = computed(() =>
    this._takes().filter((t) => t.video_url && t.active === false),
  );

  readonly nextFilename = computed(() => {
    const take = this.currentTake();
    if (!take) return null;
    return this.buildFilename();
  });

  // ── Model ────────────────────────────────────────────────────────

  private readonly _modelCode = signal<ModelData | null>(null);
  readonly modelCode = this._modelCode.asReadonly();

  // ── Skill ────────────────────────────────────────────────────────

  private readonly _selectedSkill = signal<SkillBrief | null>(null);
  readonly selectedSkill = this._selectedSkill.asReadonly();

  setSelectedSkill(skill: SkillBrief | null): void {
    this._selectedSkill.set(skill);
  }

  // ── Prompt ───────────────────────────────────────────────────────

  private readonly _rawDescription = signal<string>(PROMPT_TEMPLATE);
  readonly rawDescription = this._rawDescription.asReadonly();
  readonly rawLength = computed(() => (this._rawDescription() ?? '').length);
  readonly canGenerate = computed(() => (this._rawDescription() ?? '').trim().length > 0);

  /**
   * The shot's pre-prompt exactly as it came from the backend. Set ONLY by
   * `setShotDescription`, so it never changes due to slot reindexing or user
   * edits. Used as the source of truth for registering used assets and for the
   * idempotency guard of the slot reindex.
   */
  private readonly _originalDescription = signal<string>('');
  readonly originalDescription = this._originalDescription.asReadonly();

  /**
   * Load a shot's pre-prompt from the backend: records the RAW text as the
   * original description and makes it the editor content. The reindex later
   * rewrites `rawDescription` only while it still equals the original.
   */
  setShotDescription(text: string): void {
    this._originalDescription.set(text);
    this._rawDescription.set(text);
  }

  // ── Cinematography ───────────────────────────────────────────────

  private readonly _cinematography = signal<CinematographyConfig>({
    lens: null,
    cameraBody: null,
    cameraMotion: null,
    colorGrading: null,
    genre: null,
  });

  readonly cinematography = this._cinematography.asReadonly();

  // ── Output format ────────────────────────────────────────────────

  private readonly _output = signal<OutputFormatConfig>({
    aspectRatio: '9:16',
    resolution: '720p',
    durationSeconds: 5,
    sound: true,
    engine: 'fast',
    batchCount: 1,
  });

  readonly output = this._output.asReadonly();
  private readonly _imagePreview = signal<string | null>(null);
  readonly imagePreview = this._imagePreview.asReadonly();

  // ── Clips ────────────────────────────────────────────────────────

  private readonly _sessionClips = signal<GeneratedClip[]>([]);
  private readonly _activeClipId = signal<string | null>(null);

  readonly sessionClips = this._sessionClips.asReadonly();
  readonly activeClipId = this._activeClipId.asReadonly();
  readonly activeClip = computed(
    () => this._sessionClips().find((c) => c.id === this._activeClipId()) ?? null,
  );

  // ── Pending generations ──────────────────────────────────────────

  private readonly _pendingGenerations = signal<PendingGeneration[]>([]);
  readonly pendingGenerations = this._pendingGenerations.asReadonly();
  readonly isGenerating = computed(() => this._pendingGenerations().length > 0);

  startGeneration(label?: string, takeIndex?: number): string {
    const id = `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    this._pendingGenerations.update((list) => [
      ...list,
      { id, taskId: '', progress: 0, label, takeIndex },
    ]);
    return id;
  }

  setImagePreview(image: string): void {
    this._imagePreview.set(image);
  }

  setGenerationTaskId(localId: string, taskId: string): void {
    this._pendingGenerations.update((list) =>
      list.map((g) => (g.id === localId ? { ...g, taskId } : g)),
    );
  }

  restorePendingTask(id: string, taskId: string, modelName: string): void {
    this._pendingGenerations.update((list) =>
      list.map((g) => (g.id === id ? { ...g, taskId, modelName, progress: 10 } : g)),
    );
  }

  // ── Assets (reference) ───────────────────────────────────────────

  private readonly _firstFrame = signal<ReferenceAsset | null>(null);
  private readonly _lastFrame = signal<ReferenceAsset | null>(null);
  private readonly _freeAssets = signal<ReferenceAsset[]>([]);

  readonly firstFrame = this._firstFrame.asReadonly();
  readonly lastFrame = this._lastFrame.asReadonly();
  readonly freeAssets = this._freeAssets.asReadonly();

  readonly totalCount = computed(() => {
    const f = this._firstFrame() ? 1 : 0;
    const l = this._lastFrame() ? 1 : 0;
    return f + l + this._freeAssets().filter((a) => a.kind !== 'audio').length;
  });

  // ── Used assets (character library) ──────────────────────────────

  private readonly _usedAssets = signal<UsedAsset[]>([]);
  readonly usedAssets = this._usedAssets.asReadonly();

  private readonly _lastInjections = signal<Record<string, string>>({});

  // ── Takes ────────────────────────────────────────────────────────

  initStudioSession(input: {
    projectId: string;
    chapterId?: string;
    shotId?: string;
    projectName?: string;
    chapterName?: string;
    sceneName?: string;
    shotName?: string;
    sceneId: string;
    sceneCode: string;
    userHandle: string;
    totalTakes: number;
    backendTakes?: Array<{
      id: string;
      number: number;
      video_url: string;
      video_local_url: string;
      active: boolean;
      task_id?: string;
      request_payload?: string;
      rating?: number;
    }>;
  }): void {
    this._isReady.set(true);
    const total = Math.max(1, Math.min(MAX_TAKES, Math.round(input.totalTakes)));
    this._projectId.set(input.projectId);
    this._chapterId.set(input.chapterId ?? null);
    this._shotId.set(input.shotId ?? null);
    this._sceneId.set(input.sceneId);
    this._sceneCode.set(input.sceneCode);
    if (input.projectName) this._projectName.set(input.projectName);
    if (input.chapterName !== undefined) this._chapterName.set(input.chapterName);
    if (input.sceneName) this._sceneName.set(input.sceneName);
    if (input.shotName !== undefined) this._shotName.set(input.shotName);
    this._userHandle.set(input.userHandle);

    if (input.backendTakes && input.backendTakes.length > 0) {
      const merged: Take[] = Array.from({ length: total }, (_, i) => {
        const number = i + 1;
        const backend = input.backendTakes!.find((bt) => bt.number === number);
        return {
          index: number,
          status: backend && backend.video_url ? ('confirmed' as const) : ('pending' as const),
          id: backend?.id,
          video_url: backend?.video_url,
          video_local_url: backend?.video_local_url,
          active: backend?.active ?? true,
          number: backend?.number ?? 0,
          request_payload: backend?.request_payload,
          rating: backend?.rating,
        };
      });
      this._takes.set(merged);
    } else {
      // No backend takes — don't create phantom entries
      this._takes.set([]);
    }
    this._currentTakeIndex.set(0);
  }

  /** Update the session's scene code (e.g. after renaming a scene). */
  setSceneCode(code: string): void {
    this._sceneCode.set(code);
  }

  /** Update the session's scene name (e.g. after renaming a scene). */
  setSceneName(name: string): void {
    this._sceneName.set(name);
  }

  /** Update the session's shot name (e.g. after renaming a shot). */
  setShotName(name: string): void {
    this._shotName.set(name);
  }

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

  selectTake(takeIndex: number): void {
    const idx = this._takes().findIndex((t) => t.index === takeIndex);
    if (idx >= 0) {
      this._currentTakeIndex.set(idx);
    }
  }

  saveGenerationResponse(
    takeIndex: number,
    backendTake: { id: string; video_url: string; video_local_url: string },
  ): void {
    this._takes.update((list) =>
      list.map((t) =>
        t.index === takeIndex
          ? {
              ...t,
              id: backendTake.id,
              video_url: backendTake.video_url,
              video_local_url: backendTake.video_local_url,
              active: true,
              status: 'confirmed' as const,
            }
          : t,
      ),
    );
  }

  resetStudio(): void {
    this._isReady.set(false);
    this._projectId.set(null);
    this._projectName.set('');
    this._chapterName.set('');
    this._sceneId.set(null);
    this._sceneCode.set('');
    this._sceneName.set('');
    this._shotName.set('');
    this._userHandle.set('');
    this._takes.set([]);
    this._currentTakeIndex.set(0);
    this._rawDescription.set(PROMPT_TEMPLATE);
    this._originalDescription.set('');
    this._cinematography.set({
      lens: null,
      cameraBody: null,
      cameraMotion: null,
      colorGrading: null,
      genre: null,
    });
    this._sessionClips.set([]);
    this._activeClipId.set(null);
    this._usedAssets.set([]);
    this._pendingGenerations.set([]);
    this._firstFrame.set(null);
    this._lastFrame.set(null);
    this._freeAssets.set([]);
    // Intentionally NOT clearing the selected model: it's a user-level
    // preference (defaults to Dreamina-Seedance-2-0-Gallery) that should
    // persist across scene/shot navigation until the user changes it.
    this._chapterPresetIds.set(new Set());
    this._chapterCharacterIds.set(new Set());
    this._chapterCharacterData.set([]);
    this._chapterAssetIds.set(new Set());
    this._chapterAssetSlots.set(new Map());
    this._chapterAssetAssignmentIds.set(new Map());
    this._assignmentsLoaded.set(false);
    // shot resources removed — using chapter assignments only
  }

  filenameForClip(clip: Pick<GeneratedClip, 'id' | 'takeIndex'>): string {
    if (clip.id) return this.buildFilename();
    return `clip-${clip.id}.mp4`;
  }

  private buildFilename(): string {
    const code = this._sceneCode();
    const handle = this._userHandle();
    const proj = this._projectName();
    const scName = this._sceneName();
    const chapterName = this._chapterName();
    const shot = this._shotName();
    const take = this._currentTakeIndex() + 1;
    const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const ts = new Date().getTime();
    const projPart = proj ? `${safe(proj)}_` : '';
    const scenePart = scName ? `${safe(scName)}_` : `${safe(code)}_`;
    const chapterPart = chapterName ? `EP_${safe(chapterName)}_` : '';
    const shotPart = shot ? `SHOT_${safe(shot)}_` : '';
    return `${projPart}${chapterPart}${scenePart}${shotPart}T${take}_${safe(handle)}_${ts}.mp4`;
  }

  // ── Model ────────────────────────────────────────────────────────

  set model(value: ModelData | null) {
    this._modelCode.set(value);
  }

  // ── Prompt ───────────────────────────────────────────────────────

  setRawDescription(text: string) {
    this._rawDescription.set(text);
  }

  // ── Cinematography ───────────────────────────────────────────────

  patchCinematography(patch: Partial<CinematographyConfig>) {
    this._cinematography.update((c) => ({ ...c, ...patch }));
    this.syncPromptInjections();
  }

  // ── Output format ────────────────────────────────────────────────

  patchOutput(patch: Partial<OutputFormatConfig>) {
    this._output.update((o) => {
      const merged = { ...o, ...patch };
      if (patch.batchCount !== undefined) {
        merged.batchCount = clamp(Math.round(patch.batchCount), 1, MAX_BATCH_COUNT);
      }
      return merged;
    });
  }

  // ── Pending generations ──────────────────────────────────────────

  updateGenerationProgress(id: string, progress: number): void {
    const next = clamp(Math.round(progress), 0, 100);
    this._pendingGenerations.update((list) =>
      list.map((g) => (g.id === id ? { ...g, progress: next } : g)),
    );
  }

  completeGeneration(id: string, clip?: GeneratedClip): void {
    const pending = this._pendingGenerations().find((g) => g.id === id);
    this._pendingGenerations.update((list) => list.filter((g) => g.id !== id));
    if (clip) {
      const withTake =
        pending?.takeIndex !== undefined && clip.takeIndex === undefined
          ? { ...clip, takeIndex: pending.takeIndex }
          : clip;
      this.pushClip(withTake);
    }
  }

  failGeneration(id: string): void {
    this._pendingGenerations.update((list) => list.filter((g) => g.id !== id));
  }

  pushClip(clip: GeneratedClip) {
    this._sessionClips.update((list) => [clip, ...list]);
    this._activeClipId.set(clip.id);
  }

  selectClip(id: string | null) {
    this._activeClipId.set(id);
  }

  setClipRating(id: string, rating: number): void {
    const clip = this._sessionClips().find((c) => c.id === id);
    if (!clip) return;
    if (clip.takeIndex === undefined) {
      // Clip not tied to a session take — just update the clip in-memory.
      const clamped = Math.max(0, Math.min(5, Math.round(rating)));
      this._sessionClips.update((list) =>
        list.map((c) => (c.id === id ? { ...c, rating: clamped } : c)),
      );
      return;
    }
    this.setTakeRating(clip.takeIndex, rating);
  }

  /** Sets a session take's rating (1-based index), keeping any matching clips
   *  in sync and persisting to the backend when the take has a DB id. */
  setTakeRating(index: number, rating: number): void {
    const clamped = Math.max(0, Math.min(5, Math.round(rating)));

    this._takes.update((list) =>
      list.map((t) => (t.index === index ? { ...t, rating: clamped } : t)),
    );

    this._sessionClips.update((list) =>
      list.map((c) => (c.takeIndex === index ? { ...c, rating: clamped } : c)),
    );

    const take = this._takes().find((t) => t.index === index);
    const pid = this._projectId();
    const cid = this._chapterId();
    const sid = this._sceneId();
    const shid = this._shotId();
    if (take?.id && pid && cid && sid && shid) {
      this.projectsApi
        .updateTake(pid, cid, sid, shid, take.id, { rating: clamped })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }

  /** Ratings map: takeIndex → rating, for the takes-reel component. */
  readonly takeRatings = computed<Record<number, number>>(() => {
    const ratings: Record<number, number> = {};
    for (const take of this._takes()) {
      if (take.rating && take.rating > 0) {
        ratings[take.index] = take.rating;
      }
    }
    return ratings;
  });

  // ── Used assets (character library) ──────────────────────────────

  clearUsedAssets() {
    this._usedAssets.set([]);
    // Per-shot reset: the previous shot's raw description must not leak into
    // the next shot's slot hydration (which would register the wrong assets).
    this._originalDescription.set('');
  }

  useAsset(asset: UsedAsset) {
    this._usedAssets.update((list) => {
      if (list.some((a) => a.fileId === asset.fileId)) return list;
      return [...list, asset];
    });

    // Also register the character as assigned so it appears in "My Library".
    // This lets the "Use" button in IndexCharacters populate the library
    // panel without requiring a backend chapter-assignment call.
    if (asset.characterId) {
      this._chapterCharacterIds.update((set) => {
        if (set.has(asset.characterId)) return set;
        const next = new Set(set);
        next.add(asset.characterId);
        return next;
      });
      this._chapterCharacterData.update((list) => {
        if (list.some((c) => c.id === asset.characterId)) return list;
        return [
          ...list,
          { id: asset.characterId, name: asset.name, slot: '', fileId: '', kind: 'character' },
        ];
      });
      this._assignmentsLoaded.set(true);
    }
  }

  unuseAsset(idOrFileId: string) {
    this._usedAssets.update((list) =>
      list.filter((a) => a.fileId !== idOrFileId && a.characterId !== idOrFileId),
    );
  }

  // ── Reference assets (drop-zone) ─────────────────────────────────

  setFirstFrame(asset: ReferenceAsset | null) {
    this.revoke(this._firstFrame());
    this._firstFrame.set(asset ? { ...asset, slot: 'first-frame' } : null);
  }

  setLastFrame(asset: ReferenceAsset | null) {
    this.revoke(this._lastFrame());
    this._lastFrame.set(asset ? { ...asset, slot: 'last-frame' } : null);
  }

  addFreeAsset(asset: ReferenceAsset) {
    this._freeAssets.update((list) => {
      const sameKind = list.filter((a) => a.kind === asset.kind).length;
      const tagBase = asset.kind === 'image' ? 'Image' : asset.kind === 'video' ? 'Video' : 'Audio';
      return [...list, { ...asset, slot: 'free', tag: `${tagBase} ${sameKind + 1}` }];
    });
  }

  removeFreeAsset(id: string) {
    this._freeAssets.update((list) => {
      const target = list.find((a) => a.id === id);
      if (target) this.revoke(target);
      return list.filter((a) => a.id !== id);
    });
  }

  /** Register the chapter_assets row id for a file after assigning it, so the
   *  asset can be unassigned later without waiting for a reload. */
  registerChapterAssetAssignment(fileId: string, assignmentId: string) {
    this._chapterAssetAssignmentIds.update((m) => {
      const next = new Map(m);
      next.set(fileId, assignmentId);
      return next;
    });
  }

  /** Remove a file from the episode assets entirely (store side; the caller
   *  performs the API call that unassigns it from the chapter). */
  removeChapterAsset(fileId: string) {
    this.removeFreeAsset(fileId);
    this._chapterAssetSlots.update((m) => {
      const next = new Map(m);
      next.delete(fileId);
      return next;
    });
    this._chapterAssetIds.update((s) => {
      const next = new Set(s);
      next.delete(fileId);
      return next;
    });
    this._chapterAssetAssignmentIds.update((m) => {
      const next = new Map(m);
      next.delete(fileId);
      return next;
    });
  }

  replaceFreeAssets(next: ReferenceAsset[]) {
    this._freeAssets().forEach((a) => this.revoke(a));
    this._freeAssets.set(next);
  }

  clearAllAssets() {
    this.revoke(this._firstFrame());
    this.revoke(this._lastFrame());
    this._freeAssets().forEach((a) => this.revoke(a));
    this._firstFrame.set(null);
    this._lastFrame.set(null);
    this._freeAssets.set([]);
  }

  private revoke(a: ReferenceAsset | null | undefined) {
    if (a?.thumbnailUrl && a.thumbnailUrl.startsWith('blob:')) {
      URL.revokeObjectURL(a.thumbnailUrl);
    }
  }

  setChapterAssignments(assignments: { presets: any[]; characters: any[]; assets: any[] }): void {
    this._chapterPresetIds.set(
      new Set([...(assignments.presets ?? [])].map((a: any) => a.preset_id).filter(Boolean)),
    );
    const chars = assignments.characters ?? [];
    this._chapterCharacterIds.set(new Set(chars.map((a: any) => a.character_id).filter(Boolean)));
    this._chapterCharacterData.set(
      chars
        .filter((a: any) => a.character_id && a.name)
        .map((a: any) => {
          const slot = a.slot ?? '';
          const kind = slot.startsWith('@video')
            ? 'video'
            : slot.startsWith('@audio')
              ? 'audio'
              : 'image';
          return {
            id: a.character_id,
            name: a.name,
            slot,
            fileId: a.file_id ?? '',
            kind,
          };
        }),
    );
    this._chapterAssetIds.set(
      new Set([...(assignments.assets ?? [])].map((a: any) => a.file_id).filter(Boolean)),
    );
    // Preserve each asset's [ImageN] slot so the Prompt Builder respects it.
    const assetSlots = new Map<string, string>();
    // fileId → chapter_assets row id (needed to unassign from the episode).
    const assignmentIds = new Map<string, string>();
    for (const a of assignments.assets ?? []) {
      if (a.file_id && a.slot) assetSlots.set(a.file_id, a.slot);
      if (a.file_id && a.id) assignmentIds.set(a.file_id, a.id);
    }
    this._chapterAssetSlots.set(assetSlots);
    this._chapterAssetAssignmentIds.set(assignmentIds);

    const freeAssets: ReferenceAsset[] = (assignments.assets ?? [])
      .filter((a: any) => a.file_id)
      .map((a: any) => ({
        id: a.file_id,
        kind: (a.mime_type || '').startsWith('video')
          ? 'video'
          : (a.mime_type || '').startsWith('audio')
            ? 'audio'
            : 'image',
        filename: a.filename || 'asset',
        thumbnailUrl: '',
        tag: '',
        slot: 'free' as const,
      }));
    this.replaceFreeAssets(freeAssets);
    this._assignmentsLoaded.set(true);
  }

  // ── Clip reuse ───────────────────────────────────────────────────

  reuseClip(clipId: string) {
    const clip = this._sessionClips().find((c) => c.id === clipId);
    if (!clip?.source) return;
    this._rawDescription.set(clip.source.rawDescription);
    this._cinematography.set(clip.source.cinematography);
    this._output.set(clip.source.output);

    const assetSnap = clip.source.assets;
    if (assetSnap) {
      this.setFirstFrame(assetSnap.firstFrame);
      this.setLastFrame(assetSnap.lastFrame);
      this.replaceFreeAssets(assetSnap.free);
    }

    this._lastInjections.set(this.buildInjectionsMap());
  }

  // ── Prompt injection (from presets into textarea sections) ───────

  private buildInjectionsMap(): Record<string, string> {
    const cine = this._cinematography();
    const lens = this.presets.findPreset(cine.lens);
    const body = this.presets.findPreset(cine.cameraBody);
    const motion = this.presets.findPreset(cine.cameraMotion);
    const grade = this.presets.findPreset(cine.colorGrading);
    const genre = this.presets.findPreset(cine.genre);

    const bySection: Record<string, string[]> = {};
    const push = (section: string, value?: string) => {
      if (!value) return;
      bySection[section] ??= [];
      bySection[section].push(value);
    };
    push(PRESET_SECTION_TARGETS.lens, lens?.prompt);
    push(PRESET_SECTION_TARGETS.cameraBody, body?.prompt);
    push(PRESET_SECTION_TARGETS.cameraMotion, motion?.prompt);
    push(PRESET_SECTION_TARGETS.colorGrading, grade?.prompt);
    push(PRESET_SECTION_TARGETS.genre, genre?.prompt);

    const out: Record<string, string> = {};
    for (const [section, parts] of Object.entries(bySection)) {
      out[section] = parts.join('. ');
    }
    return out;
  }

  private syncPromptInjections() {
    const next = this.buildInjectionsMap();
    const prev = this._lastInjections();
    let text = this._rawDescription();

    const headers = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const header of headers) {
      text = this.replaceSectionInjection(text, header, prev[header] ?? '', next[header] ?? '');
    }
    this._rawDescription.set(text);
    this._lastInjections.set(next);
  }

  private replaceSectionInjection(
    text: string,
    header: string,
    previous: string,
    next: string,
  ): string {
    if (previous && text.includes(previous)) {
      if (next) return text.replace(previous, next);
      const cleaned = text.replace(previous, '');
      return cleaned.replace(
        new RegExp(`(${escapeRegex(header)})([ \\t]*[.,;])+([ \\t]*)`, 'g'),
        '$1$3',
      );
    }
    if (!next) return text;

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith(header)) {
        const rest = line.slice(header.length).trim();
        if (rest) {
          const sep = rest.endsWith('.') ? ' ' : '. ';
          lines[i] = `${header} ${rest}${sep}${next}`;
        } else {
          lines[i] = `${header} ${next}`;
        }
        return lines.join('\n');
      }
    }
    return text;
  }
}
