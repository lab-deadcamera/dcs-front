import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { describe, beforeEach, beforeAll, it, expect, vi } from 'vitest';
import { TranslateService } from '@ngx-translate/core';

import { StudioStore } from '@app/core/stores/studio.store';
import { Sequence, Shot } from '@app/core/interfaces';
import type { ShotSequenceViewerComponent } from './shot-sequence-viewer.component';

// ─── Test doubles ──────────────────────────────────────────────────────

@Injectable()
class StudioStoreStub {
  readonly chapterCharacterData = vi.fn().mockReturnValue([]);
  readonly freeAssets = vi.fn().mockReturnValue([]);
}

// ─── Fixtures ──────────────────────────────────────────────────────────

function makeShot(id: string, promptEn: string, refSlots: string[] = []): Shot {
  return {
    id,
    title: `Shot ${id}`,
    description: promptEn,
    duration: 5,
    start: 0,
    end: 5,
    references: refSlots.map((slot) => ({ slot, assetId: `missing-${slot}`, type: 'character' })),
    prompt: { en: promptEn, zh: '' },
    camera: {} as any,
    composition: {},
    blocking: {},
    acting: {},
    timeline: { duration: 5, segments: [], beats: [] },
    audio: {},
    render: {} as any,
    notes: {},
  };
}

function makeSequence(shots: Shot[]): Sequence {
  return {
    description: 'Test sequence',
    duration: shots.length * 5,
    mode: 'M1' as any,
    aspectRatio: '9:16' as any,
    references: shots.flatMap((s) => s.references),
    sequenceFlow: {
      title: '',
      duration: shots.length * 5,
      metric: 'dramaticIntensity' as any,
      scale: { start: '', end: '', min: 0, max: 1 } as any,
      segments: shots.map((s) => ({
        id: s.id,
        shotId: s.id,
        label: s.id,
        start: 0,
        end: 5,
        intensity: 0.5,
      })),
    },
    shots,
  };
}

// ─── Suite ─────────────────────────────────────────────────────────────

describe('ShotSequenceViewerComponent', () => {
  let ComponentClass: typeof ShotSequenceViewerComponent;
  let fixture: ComponentFixture<ShotSequenceViewerComponent>;
  let component: ShotSequenceViewerComponent;

  beforeAll(async () => {
    ({ ShotSequenceViewerComponent: ComponentClass } = await import(
      './shot-sequence-viewer.component'
    ));
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: StudioStore, useClass: StudioStoreStub },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
      ],
    })
      .overrideComponent(ComponentClass, {
        set: {
          template: '<div></div>',
          imports: [],
          styles: [],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ComponentClass);
    component = fixture.componentInstance;
  });

  function setSequence(shots: Shot[]): void {
    fixture.componentRef.setInput('sequence', makeSequence(shots));
    fixture.detectChanges();
  }

  it('solo emite los shots aprobados al crear pre-prompts', () => {
    setSequence([makeShot('S1', 'prompt-1'), makeShot('S2', 'prompt-2')]);
    (component as any).approvedMap['S1'] = true;
    (component as any).approvedTick.update((n: number) => n + 1);

    const emitted: any[] = [];
    (component as any).createPrePromptsClicked.subscribe((l: any[]) => emitted.push(l));
    (component as any).emitCreatePrePrompts();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].map((e: any) => e.shotId)).toEqual(['S1']);
  });

  it('no emite y muestra el diálogo cuando no hay shots aprobados', () => {
    setSequence([makeShot('S1', 'prompt-1'), makeShot('S2', 'prompt-2')]);

    const emitted: any[] = [];
    (component as any).createPrePromptsClicked.subscribe((l: any[]) => emitted.push(l));
    (component as any).createPrePrompts();

    expect(emitted).toHaveLength(0);
    expect((component as any).noApprovedVisible()).toBe(true);
  });

  it('conserva la edición del prompt (doble click) y la usa al crear', () => {
    setSequence([makeShot('S1', 'prompt-1')]);
    (component as any).approvedMap['S1'] = true;
    (component as any).approvedTick.update((n: number) => n + 1);

    (component as any).onPromptChange('S1', { lang: 'en', value: 'prompt-1 EDITADO' });

    // El shot derivado para la tarjeta refleja el cambio.
    const derived = (component as any).shotFor((component as any).sequence().shots[0]);
    expect(derived.prompt.en).toBe('prompt-1 EDITADO');

    // El preview del resumen también.
    expect((component as any).promptPreview((component as any).sequence().shots[0])).toBe(
      'prompt-1 EDITADO',
    );

    // Y el pre-prompt emitido usa el valor editado.
    const emitted: any[] = [];
    (component as any).createPrePromptsClicked.subscribe((l: any[]) => emitted.push(l));
    (component as any).emitCreatePrePrompts();
    expect(emitted[0][0].prompt).toBe('prompt-1 EDITADO');
  });

  it('los cambios de aprobación son reactivos (approvedShots se actualiza)', () => {
    setSequence([makeShot('S1', 'p1'), makeShot('S2', 'p2')]);
    (component as any).onApprovedChange('S2', true);

    expect((component as any).approvedShots().map((s: Shot) => s.id)).toEqual(['S2']);
  });

  it('unresolvedRefs es la ÚNICA fuente: todas las refs sin resolver, aprobadas o no', () => {
    setSequence([makeShot('S1', 'p1', ['[Image1]']), makeShot('S2', 'p2', ['[Image2]'])]);
    (component as any).approvedMap['S1'] = true;
    (component as any).approvedTick.update((n: number) => n + 1);

    // No depende de la aprobación: [Image1] y [Image2] aparecen igual.
    expect((component as any).unresolvedRefs().map((r: any) => r.slot).sort()).toEqual([
      '[Image1]',
      '[Image2]',
    ]);
  });

  it('excluye los slots ya asignados por el resolver', () => {
    setSequence([makeShot('S1', 'p1', ['[Image1]'])]);
    (component as any).onAssignedSlotsChange(new Set(['[Image1]']));

    expect((component as any).unresolvedRefs()).toHaveLength(0);
  });

  it('resuelve una ref de free asset por filename (no solo por id)', () => {
    const studioStub = TestBed.inject(StudioStore) as unknown as { freeAssets: ReturnType<typeof vi.fn> };
    studioStub.freeAssets.mockReturnValue([
      { id: 'file-a', filename: 'Kitchen Plate.jpg', kind: 'image', tag: '', slot: 'free' },
    ]);
    setSequence([makeShot('S1', 'p1', ['[Image4]'])]);

    // La ref apunta al nombre del archivo (como genera el backend), no al id.
    const seq = (component as any).sequence();
    seq.references = [{ slot: '[Image4]', assetId: 'Kitchen Plate.jpg', type: 'location' }];
    fixture.detectChanges();

    expect((component as any).unresolvedRefs()).toHaveLength(0);
    expect((component as any).refNameFor(seq.references[0])).toBe('Kitchen Plate.jpg');
  });

  it('agrupa los shots aprobados por escena en el preview del super-admin', () => {
    // Añade grouping de escenas al sequence (scriptNumber + shotIds con ids prefijados).
    const shots = [
      { ...makeShot('89-A', 'prompt 89a'), title: 'Wide shot' },
      { ...makeShot('89-B', 'prompt 89b'), title: 'Medium shot' },
      { ...makeShot('90-A', 'prompt 90a'), title: 'Close shot' },
    ];
    const seq = makeSequence(shots);
    seq.scenes = [
      {
        scriptNumber: 89,
        scriptLocation: 'EXT. BANK — DAY',
        title: 'S1',
        description: '',
        duration: 10,
        sceneType: 'present' as any,
        mode: 'M1' as any,
        references: [],
        shotIds: ['89-A', '89-B'],
      },
      {
        scriptNumber: 90,
        scriptLocation: 'INT. BANK — CONT',
        title: 'S2',
        description: '',
        duration: 10,
        sceneType: 'present' as any,
        mode: 'M1' as any,
        references: [],
        shotIds: ['90-A'],
      },
    ];
    fixture.componentRef.setInput('sequence', seq);
    fixture.detectChanges();

    (component as any).approvedMap['89-B'] = true;
    (component as any).approvedMap['90-A'] = true;
    (component as any).approvedTick.update((n: number) => n + 1);
    fixture.detectChanges();

    const scenes = (component as any).previewScenes();
    expect(scenes).toHaveLength(2);
    expect(scenes[0].scriptNumber).toBe(89);
    expect(scenes[0].scriptLocation).toBe('EXT. BANK — DAY');
    expect(scenes[0].shots.map((s: any) => s.id)).toEqual(['89-B']);
    expect(scenes[0].shots[0].prompt).toBe('prompt 89b');
    expect(scenes[1].scriptNumber).toBe(90);
    expect(scenes[1].shots.map((s: any) => s.id)).toEqual(['90-A']);
    expect((component as any).previewShotCount()).toBe(2);
  });

  it('openPreview solo abre el modal para super-admin', () => {
    fixture.componentRef.setInput('isSuperAdmin', false);
    (component as any).openPreview();
    expect((component as any).previewVisible()).toBe(false);

    fixture.componentRef.setInput('isSuperAdmin', true);
    (component as any).openPreview();
    expect((component as any).previewVisible()).toBe(true);
  });

  it('reemplaza el slot de la ref por el slot del recurso del episodio (refs y pre-prompt)', () => {
    setSequence([makeShot('S1', 'Mira a [Image1] mientras avanza', ['[Image1]'])]);
    (component as any).pendingRefShotId = 'S1';

    (component as any).onResourceAssigned({
      ref: { slot: '[Image1]', assetId: 'missing-[Image1]', type: 'character' },
      resource: { id: 'char-clara', name: 'Clara', slot: '[Image5]' },
    });

    const derived = (component as any).shotFor((component as any).sequence().shots[0]);
    // La ref ahora apunta al slot del recurso y al recurso en sí.
    expect(derived.references[0].slot).toBe('[Image5]');
    expect(derived.references[0].assetId).toBe('char-clara');
    // El token del pre-prompt se reemplazó por el slot del recurso.
    expect(derived.prompt.en).toBe('Mira a [Image5] mientras avanza');

    // Y el pre-prompt emitido al crear usa el token reemplazado.
    (component as any).approvedMap['S1'] = true;
    (component as any).approvedTick.update((n: number) => n + 1);
    const emitted: any[] = [];
    (component as any).createPrePromptsClicked.subscribe((l: any[]) => emitted.push(l));
    (component as any).emitCreatePrePrompts();
    expect(emitted[0][0].prompt).toBe('Mira a [Image5] mientras avanza');
  });

  it('no toca la ref cuando el recurso del episodio no tiene slot propio', () => {
    setSequence([makeShot('S1', 'plano con [Image1]', ['[Image1]'])]);
    (component as any).pendingRefShotId = 'S1';

    (component as any).onResourceAssigned({
      ref: { slot: '[Image1]', assetId: 'missing-[Image1]', type: 'character' },
      resource: { id: 'file-x', name: 'placa.png', slot: '' },
    });

    const derived = (component as any).shotFor((component as any).sequence().shots[0]);
    expect(derived.references[0].slot).toBe('[Image1]');
    expect(derived.references[0].assetId).toBe('file-x');
    expect(derived.prompt.en).toBe('plano con [Image1]');
  });
});
