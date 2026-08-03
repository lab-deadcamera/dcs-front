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
import { ModelService } from '@app/services/model.service';
import { MessageService } from 'primeng/api';
import { Sequence } from '@app/core/interfaces';
import dataMock from '@app/core/mocks/data.json';
import type { ShotBuilderPanelComponent } from './shot-builder-panel.component';

// ─── Test doubles ──────────────────────────────────────────────────────

@Injectable()
class StudioStoreStub {
  readonly patchOutput = vi.fn();
  readonly chapterCharacterData = vi.fn().mockReturnValue([]);
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

    fixture = TestBed.createComponent(ComponentClass);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('projectId', 'proj-1');
    fixture.componentRef.setInput('chapterId', 'chap-1');
    fixture.detectChanges();
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
