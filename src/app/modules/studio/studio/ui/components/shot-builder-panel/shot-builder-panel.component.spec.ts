import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
import { describe, beforeEach, beforeAll, it, expect, vi } from 'vitest';

import { ShotBuilderService, ShotBuilderResult, SceneData } from '@app/services/shot-builder.service';
import { shotBuilderResultToSequence } from '@app/services/shot-builder.service';
import { StudioStore } from '@app/core/stores/studio.store';
import { SessionStore } from '@app/core/stores/session.store';
import { StudioApiService } from '@app/services/studio-api.service';
import { ProjectsApiService } from '@app/modules/projects/projects/services/projects-api.service';
import { FilesApiService } from '@app/services/files-api.service';
import { CharactersApiService } from '@app/modules/characters/characters/services/characters-api.service';
import { ModelService } from '@app/services/model.service';
import { MessageService } from 'primeng/api';
import { Sequence } from '@app/core/interfaces';
import dataMock from '@app/core/mocks/data.json';
import type { ShotBuilderPanelComponent } from './shot-builder-panel.component';

// ─── Test doubles ──────────────────────────────────────────────────────

@Injectable()
class StudioStoreStub {
  readonly patchOutput = vi.fn();
  readonly addFreeAsset = vi.fn();
  readonly removeChapterAsset = vi.fn();
  readonly registerChapterAssetAssignment = vi.fn();
  readonly setChapterAssignments = vi.fn();
  readonly chapterCharacterData = vi.fn().mockReturnValue([]);
  readonly chapterAssetSlots = vi.fn().mockReturnValue(new Map());
  readonly chapterAssetAssignmentIds = vi.fn().mockReturnValue(new Map());
  readonly projectId = vi.fn().mockReturnValue('');
  readonly chapterId = vi.fn().mockReturnValue('');
  readonly sceneId = vi.fn().mockReturnValue('');
  readonly output = vi.fn().mockReturnValue({ aspectRatio: '9:16' });
}

@Injectable()
class SessionStoreStub {
  readonly user = vi.fn().mockReturnValue(null);
}

@Injectable()
class ModelServiceStub {
  readonly getAllModels = vi.fn().mockReturnValue(of({ error: true }));
}

@Injectable()
class ShotBuilderServiceStub {
  readonly createShot = vi.fn();
}

@Injectable()
class StudioApiServiceStub {
  readonly updateShotFormat = vi.fn().mockReturnValue(of({ success: true }));
}

@Injectable()
class ProjectsApiServiceStub {
  readonly listScenes = vi.fn().mockReturnValue(of({ data: [{ id: 'sc-56', number: 56 }] }));
  readonly assignAssetToChapter = vi.fn().mockReturnValue(of({ success: true }));
  readonly removeAssetFromChapter = vi.fn().mockReturnValue(of({ success: true }));
  readonly getChapterAssignments = vi.fn().mockReturnValue(of({ success: true }));
}

@Injectable()
class FilesApiServiceStub {
  readonly upload = vi.fn();
  readonly serveUrl = vi.fn((id: string) => `/api/v1/files/${id}/serve`);
}

@Injectable()
class CharactersApiServiceStub {
  readonly list = vi.fn().mockReturnValue(of({ error: true }));
}

const sanitizerStub = {
  sanitize: (ctx: unknown, value: unknown) => value,
  bypassSecurityTrustResourceUrl: (value: unknown) => value,
};

// ─── Helpers ───────────────────────────────────────────────────────────

function makeScene(number: number, durations: number[]): SceneData {
  return {
    scriptNumber: number,
    scriptLocation: `Scene ${number}`,
    title: '',
    description: '',
    duration: durations.reduce((a, b) => a + b, 0),
    start: 0,
    end: durations.reduce((a, b) => a + b, 0),
    sceneType: 'present',
    mode: 'M1',
    continuity: {
      location: `Scene ${number}`,
      locationChange: false,
      timeContinuity: '',
      charactersPresent: [],
    },
    references: [],
    shots: durations.map((duration, i) => ({
      number: i + 1,
      name: `Shot ${i + 1}`,
      description: '',
      duration,
      references: [],
    })),
  };
}

function prePromptList(sceneNumber: number, ids: string[]): {
  sceneNumber: number;
  shotId: string;
  lang: 'en' | 'zh';
  prompt: string;
}[] {
  return ids.map((id) => ({ sceneNumber, shotId: id, lang: 'en', prompt: `prompt-${id}` }));
}

// ─── Suite ─────────────────────────────────────────────────────────────

describe('ShotBuilderPanelComponent — duración', () => {
  let ComponentClass: typeof ShotBuilderPanelComponent;
  let fixture: ComponentFixture<ShotBuilderPanelComponent>;
  let component: ShotBuilderPanelComponent;
  let studio: StudioStoreStub;
  let shotsSvc: ShotBuilderServiceStub;
  let api: StudioApiServiceStub;
  let files: FilesApiServiceStub;
  let projects: ProjectsApiServiceStub;
  let chars: CharactersApiServiceStub;

  beforeAll(async () => {
    // pdfjs-dist references browser DOM globals at module load (new DOMMatrix()).
    // Vitest runs in Node, so polyfill a minimal DOMMatrix BEFORE importing the
    // component (which statically imports pdfjs-dist for PDF preview).
    if (!(globalThis as any).DOMMatrix) {
      class DOMMatrixPolyfill {
        a = 1;
        b = 0;
        c = 0;
        d = 1;
        e = 0;
        f = 0;
        constructor(init?: number[] | Record<string, number>) {
          if (Array.isArray(init) && init.length >= 6) {
            [this.a, this.b, this.c, this.d, this.e, this.f] = init;
          } else if (init && typeof init === 'object') {
            Object.assign(this, init);
          }
        }
        preMultiplySelf() {
          return this;
        }
        translate(x: number, y: number) {
          return new DOMMatrixPolyfill([this.a, this.b, this.c, this.d, this.e + x, this.f + y]);
        }
        scale(x: number, y: number) {
          return new DOMMatrixPolyfill([this.a * x, this.b, this.c, this.d * y, this.e, this.f]);
        }
        invertSelf() {
          return this;
        }
        multiplySelf() {
          return this;
        }
        multiply() {
          return new DOMMatrixPolyfill();
        }
      }
      (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
    }

    ({ ShotBuilderPanelComponent: ComponentClass } = await import(
      './shot-builder-panel.component'
    ));
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: StudioStore, useClass: StudioStoreStub },
        { provide: SessionStore, useClass: SessionStoreStub },
        { provide: ShotBuilderService, useClass: ShotBuilderServiceStub },
        { provide: StudioApiService, useClass: StudioApiServiceStub },
        { provide: ProjectsApiService, useClass: ProjectsApiServiceStub },
        { provide: FilesApiService, useClass: FilesApiServiceStub },
        { provide: CharactersApiService, useClass: CharactersApiServiceStub },
        { provide: ModelService, useClass: ModelServiceStub },
        { provide: MessageService, useValue: { add: vi.fn() } },
        { provide: DomSanitizer, useValue: sanitizerStub },
      ],
    })
      .overrideComponent(ComponentClass, {
        set: {
          template: '<div></div>',
          imports: [],
          styles: [],
          providers: [{ provide: MessageService, useValue: { add: vi.fn() } }],
        },
      })
      .compileComponents();

    studio = TestBed.inject(StudioStore) as unknown as StudioStoreStub;
    shotsSvc = TestBed.inject(ShotBuilderService) as unknown as ShotBuilderServiceStub;
    api = TestBed.inject(StudioApiService) as unknown as StudioApiServiceStub;
    files = TestBed.inject(FilesApiService) as unknown as FilesApiServiceStub;
    projects = TestBed.inject(ProjectsApiService) as unknown as ProjectsApiServiceStub;
    chars = TestBed.inject(CharactersApiService) as unknown as CharactersApiServiceStub;

    fixture = TestBed.createComponent(ComponentClass);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('projectId', 'proj-1');
    fixture.componentRef.setInput('chapterId', 'chap-1');
    fixture.detectChanges();
    // The real template is overridden with a stub, so Angular's ViewChild query
    // finds no popover and leaves assetPopover undefined. Provide a fake popover
    // AFTER detectChanges (a query refresh would otherwise reset it to undefined)
    // so the click handlers that call toggle()/hide() work.
    (component as any).assetPopover = { toggle: vi.fn(), hide: vi.fn() };
  });

  /** Seed the parsed response state: scene durations + sequence aspect ratio. */
  function seed(scene: SceneData, aspectRatio = '9:16') {
    component.scenes.set([scene]);
    component.sequenceData.set({ aspectRatio } as Sequence);
  }

  /** createShot resolves each shot with a sequential id. */
  function createShotsResolveWith() {
    let n = 0;
    shotsSvc.createShot.mockImplementation(() => of({ success: true, data: { id: `shot-${++n}` } }));
  }

  it('persiste la duración de CADA shot (no el total del episodio, no 15 fijo)', () => {
    createShotsResolveWith();
    seed(makeScene(56, [10, 8]));

    component.onCreatePrePrompts(prePromptList(56, ['56A', '56B']));

    // Un updateShotFormat por shot, cada uno con SU duración de la respuesta.
    expect(api.updateShotFormat).toHaveBeenCalledTimes(2);
    expect(api.updateShotFormat).toHaveBeenNthCalledWith(1, 'proj-1', 'chap-1', 'sc-56', 'shot-1', {
      aspect_ratio: '9:16',
      duration_seconds: 10,
    });
    expect(api.updateShotFormat).toHaveBeenNthCalledWith(2, 'proj-1', 'chap-1', 'sc-56', 'shot-2', {
      aspect_ratio: '9:16',
      duration_seconds: 8,
    });

    // El output del studio sigue al primer shot (el del flujo), NO al total.
    expect(studio.patchOutput).toHaveBeenCalledWith({ aspectRatio: '9:16', durationSeconds: 10 });
    expect(studio.patchOutput).not.toHaveBeenCalledWith(
      expect.objectContaining({ durationSeconds: 15 }),
    );
  });

  it('clampa la duración al cap de seguridad (15s)', () => {
    createShotsResolveWith();
    seed(makeScene(56, [20]));

    component.onCreatePrePrompts(prePromptList(56, ['56A']));

    expect(api.updateShotFormat).toHaveBeenCalledWith('proj-1', 'chap-1', 'sc-56', 'shot-1', {
      aspect_ratio: '9:16',
      duration_seconds: 15,
    });
    expect(studio.patchOutput).toHaveBeenCalledWith({ aspectRatio: '9:16', durationSeconds: 15 });
  });

  it('no aplica un aspect ratio no soportado (falla al studio)', () => {
    createShotsResolveWith();
    seed(makeScene(56, [10]), '3:2'); // inválido para el backend de video

    component.onCreatePrePrompts(prePromptList(56, ['56A']));

    // Se persiste la duración pero NO el ratio inválido.
    expect(api.updateShotFormat).toHaveBeenCalledWith('proj-1', 'chap-1', 'sc-56', 'shot-1', {
      duration_seconds: 10,
    });
    expect(
      api.updateShotFormat,
    ).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ aspect_ratio: expect.anything() }),
    );
    expect(studio.patchOutput).toHaveBeenCalledWith({ durationSeconds: 10 });
    expect(studio.patchOutput).not.toHaveBeenCalledWith(
      expect.objectContaining({ aspectRatio: expect.anything() }),
    );
  });

  it('sube un free asset: lo agrega al store y lo asigna al capítulo', () => {
    files.upload.mockReturnValue(
      of({ error: false, msg: 'ok', data: { id: 'file-1', filename: 'foto.png' } }),
    );
    const file = new File([new Uint8Array([1])], 'foto.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as unknown as Event;

    component.onFreeAssetsSelected(event);

    expect(files.upload).toHaveBeenCalledWith({ file, category: 'images', storage: 'persistent' });
    expect(studio.addFreeAsset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'file-1', kind: 'image', filename: 'foto.png' }),
    );
    expect(projects.assignAssetToChapter).toHaveBeenCalledWith('proj-1', 'chap-1', 'file-1');
  });

  it('recarga los assignments tras asignar un free asset (slot inmediato)', () => {
    files.upload.mockReturnValue(
      of({ error: false, msg: 'ok', data: { id: 'file-1', filename: 'foto.png' } }),
    );
    projects.assignAssetToChapter.mockReturnValue(
      of({ success: true, data: { id: 'assign-1' } }),
    );
    const assignmentData = { presets: [], characters: [], assets: [] };
    projects.getChapterAssignments.mockReturnValue(of({ success: true, data: assignmentData }));
    const file = new File([new Uint8Array([1])], 'foto.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as unknown as Event;

    component.onFreeAssetsSelected(event);

    expect(projects.getChapterAssignments).toHaveBeenCalledWith('proj-1', 'chap-1');
    expect(studio.setChapterAssignments).toHaveBeenCalledWith(assignmentData);
  });

  it('no asigna al capítulo cuando no hay capítulo seleccionado', () => {
    files.upload.mockReturnValue(
      of({ error: false, msg: 'ok', data: { id: 'file-2', filename: 'clip.mp4' } }),
    );
    fixture.componentRef.setInput('chapterId', null);
    const file = new File([new Uint8Array([1])], 'clip.mp4', { type: 'video/mp4' });
    const event = { target: { files: [file] } } as unknown as Event;

    component.onFreeAssetsSelected(event);

    expect(studio.addFreeAsset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'file-2', kind: 'video', filename: 'clip.mp4' }),
    );
    expect(projects.assignAssetToChapter).not.toHaveBeenCalled();
  });

  it('abre el popover de un character con sus metadatos', () => {
    const character = { id: 'char-1', name: 'Wyatt', slot: '@image1', fileId: 'file-9', kind: 'image' };
    (component as any).onCharacterInfo(new Event('click'), character);

    expect((component as any).assetInfo()).toEqual({
      kind: 'character',
      name: 'Wyatt',
      charId: 'char-1',
      fileId: 'file-9',
      slot: '@image1',
      fileKind: 'image',
    });
    expect((component as any).assetPopover.toggle).toHaveBeenCalledTimes(1);
  });

  it('deriva el assetType del character desde la librería', () => {
    chars.list.mockReturnValue(
      of({
        error: false,
        msg: 'ok',
        data: [
          {
            character: {
              id: 'char-1',
              name: 'Wyatt',
              description: '',
              metadata: JSON.stringify({ assetType: 'location' }),
              created_at: '',
              updated_at: '',
              deleted_at: null,
            },
            files: [],
          },
        ],
      }),
    );
    const character = { id: 'char-1', name: 'Wyatt', slot: '@image1', fileId: 'file-9', kind: 'image' };
    (component as any).onCharacterInfo(new Event('click'), character);

    // of(...) emits synchronously, so the map is populated by the time we assert.
    expect((component as any).assetInfoType()).toBe('location');
  });

  it('cae a "character" cuando el character no tiene metadata', () => {
    (component as any).onCharacterInfo(
      new Event('click'),
      { id: 'char-2', name: 'Ghost', slot: '', fileId: '', kind: 'image' },
    );

    expect((component as any).assetInfoType()).toBe('character');
  });

  it('abre el popover de un free asset con sus metadatos', () => {
    const asset = {
      id: 'file-3',
      kind: 'image' as const,
      filename: 'set.jpg',
      thumbnailUrl: '',
      tag: '',
      slot: 'free' as const,
    };
    (component as any).onAssetInfo(new Event('click'), asset);

    expect((component as any).assetInfo()).toEqual({
      kind: 'asset',
      filename: 'set.jpg',
      fileId: 'file-3',
      slot: '',
      fileKind: 'image',
    });
    expect((component as any).assetPopover.toggle).toHaveBeenCalledTimes(1);
  });

  it('abre el viewer completo con los datos del popover actual', () => {
    (component as any).assetInfo.set({
      kind: 'character',
      name: 'Wyatt',
      charId: 'char-1',
      fileId: 'file-9',
      slot: '@image1',
      fileKind: 'image',
    });

    (component as any).openAssetViewer();

    expect((component as any).viewerFile()).toEqual({
      id: 'file-9',
      filename: 'Wyatt',
      mimeType: 'image/png',
    });
    expect((component as any).viewerVisible()).toBe(true);
  });

  it('no abre el viewer sin fileId', () => {
    (component as any).assetInfo.set({
      kind: 'character',
      name: 'Ghost',
      charId: 'char-2',
      fileId: '',
      slot: '',
      fileKind: 'image',
    });

    (component as any).openAssetViewer();

    expect((component as any).viewerVisible()).toBe(false);
  });

  it('remueve un free asset del capítulo (backend + store)', () => {
    studio.chapterAssetAssignmentIds.mockReturnValue(new Map([['file-3', 'assign-1']]));
    (component as any).assetInfo.set({
      kind: 'asset',
      filename: 'set.jpg',
      fileId: 'file-3',
      slot: '',
      fileKind: 'image',
    });

    (component as any).onRemoveFreeAsset();

    expect(projects.removeAssetFromChapter).toHaveBeenCalledWith('proj-1', 'chap-1', 'assign-1');
    expect(studio.removeChapterAsset).toHaveBeenCalledWith('file-3');
  });

  it('remueve un free asset localmente cuando no hay assignment id', () => {
    (component as any).assetInfo.set({
      kind: 'asset',
      filename: 'set.jpg',
      fileId: 'file-3',
      slot: '',
      fileKind: 'image',
    });

    (component as any).onRemoveFreeAsset();

    expect(projects.removeAssetFromChapter).not.toHaveBeenCalled();
    expect(studio.removeChapterAsset).toHaveBeenCalledWith('file-3');
  });
});

describe('shotBuilderResultToSequence — la duración de la respuesta llega al viewer', () => {
  it('mapea las duraciones por shot de una respuesta real (mock data.json)', () => {
    const result = dataMock as unknown as ShotBuilderResult;
    const expectedDurations = (dataMock as any).scenes.flatMap((s: any) =>
      s.shots.map((sh: any) => sh.duration),
    );

    const seq = shotBuilderResultToSequence(result);

    expect(seq).not.toBeNull();
    expect(seq!.shots.map((s) => s.duration)).toEqual(expectedDurations);
    // Episodio de 100s: el primer shot dura 8, no 15.
    expect(seq!.shots[0].duration).toBe(8);
    expect(seq!.duration).toBe(100);
    expect(seq!.aspectRatio).toBe('9:16');
  });
});
