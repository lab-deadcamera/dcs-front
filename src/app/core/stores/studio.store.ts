import { computed, inject, Injectable, signal } from '@angular/core';
import { PresetsService } from './presets.service';
import { Take } from '../interfaces/session.models';
import {
  CinematographyConfig,
  GeneratedClip,
  MAX_BATCH_COUNT,
  OutputFormatConfig,
  PendingGeneration,
  PROMPT_TEMPLATE,
  ReferenceAsset,
  UsedAsset,
} from '../interfaces/studio.models';
import { ModelData } from '../interfaces';

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

  // Scene assignment filters
  private readonly _scenePresetIds = signal<Set<string>>(new Set());
  private readonly _sceneCharacterIds = signal<Set<string>>(new Set());
  private readonly _sceneAssetIds = signal<Set<string>>(new Set());
  private readonly _sceneCharacterData = signal<Array<{ id: string; name: string }>>([]);

  readonly scenePresetIds = this._scenePresetIds.asReadonly();
  readonly sceneCharacterIds = this._sceneCharacterIds.asReadonly();
  readonly sceneAssetIds = this._sceneAssetIds.asReadonly();
  readonly sceneCharacterData = this._sceneCharacterData.asReadonly();

  /** True after setSceneAssignments has been called at least once (even if
   *  the response contained null/empty arrays). Used by child components
   *  to distinguish "no assignments loaded yet" from "loaded but empty". */
  private readonly _assignmentsLoaded = signal(false);
  readonly assignmentsLoaded = this._assignmentsLoaded.asReadonly();

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

  // ── Prompt ───────────────────────────────────────────────────────

  private readonly _rawDescription = signal<string>(PROMPT_TEMPLATE);
  readonly rawDescription = this._rawDescription.asReadonly();
  readonly rawLength = computed(() => this._rawDescription().length);
  readonly canGenerate = computed(() => this._rawDescription().trim().length > 0);

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
        };
      });
      this._takes.set(merged);
    } else {
      // No backend takes — don't create phantom entries
      this._takes.set([]);
    }
    this._currentTakeIndex.set(0);
  }

  toggleTake(takeIndex: number): void {
    const list = this._takes();
    const target = list.find((t) => t.index === takeIndex);
    console.log({ list, target, takeIndex });

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
    this._scenePresetIds.set(new Set());
    this._sceneCharacterIds.set(new Set());
    this._sceneCharacterData.set([]);
    this._sceneAssetIds.set(new Set());
    this._assignmentsLoaded.set(false);
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

  setClipRating(id: string, rating: number) {
    const clamped = Math.max(0, Math.min(5, Math.round(rating)));
    this._sessionClips.update((list) =>
      list.map((c) => (c.id === id ? { ...c, rating: clamped } : c)),
    );
  }

  // ── Used assets (character library) ──────────────────────────────

  clearUsedAssets() {
    this._usedAssets.set([]);
  }

  useAsset(asset: UsedAsset) {
    this._usedAssets.update((list) => {
      if (list.some((a) => a.fileId === asset.fileId)) return list;
      return [...list, asset];
    });

    // Also register the character as assigned so it appears in "My Library".
    // This lets the "Use" button in IndexCharacters populate the library
    // panel without requiring a backend scene-assignment call.
    if (asset.characterId) {
      this._sceneCharacterIds.update((set) => {
        if (set.has(asset.characterId)) return set;
        const next = new Set(set);
        next.add(asset.characterId);
        return next;
      });
      this._sceneCharacterData.update((list) => {
        if (list.some((c) => c.id === asset.characterId)) return list;
        return [...list, { id: asset.characterId, name: asset.name }];
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

  setSceneAssignments(assignments: { presets: any[]; characters: any[]; assets: any[] }): void {
    this._scenePresetIds.set(
      new Set([...(assignments.presets ?? [])].map((a: any) => a.preset_id).filter(Boolean)),
    );
    const chars = assignments.characters ?? [];
    this._sceneCharacterIds.set(new Set(chars.map((a: any) => a.character_id).filter(Boolean)));
    this._sceneCharacterData.set(
      chars
        .filter((a: any) => a.character_id && a.name)
        .map((a: any) => ({ id: a.character_id, name: a.name })),
    );
    this._sceneAssetIds.set(
      new Set([...(assignments.assets ?? [])].map((a: any) => a.file_id).filter(Boolean)),
    );

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
