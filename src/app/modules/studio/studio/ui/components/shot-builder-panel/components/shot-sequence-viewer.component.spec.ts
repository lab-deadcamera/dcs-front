import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { describe, beforeEach, beforeAll, it, expect, vi } from 'vitest';

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
      providers: [{ provide: StudioStore, useClass: StudioStoreStub }],
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

  it('solo valida referencias de los shots aprobados', () => {
    setSequence([makeShot('S1', 'p1', ['@image1']), makeShot('S2', 'p2', ['@image2'])]);
    (component as any).approvedMap['S1'] = true;
    (component as any).approvedTick.update((n: number) => n + 1);

    // @image1 (de S1 aprobado) está sin resolver; @image2 (S2 no aprobado) no cuenta
    // en la validación de creación.
    expect((component as any).unresolvedRefs().map((r: any) => r.slot)).toEqual(['@image1']);
  });

  it('el resolver resalta TODAS las refs faltantes (aprobadas o no)', () => {
    setSequence([makeShot('S1', 'p1', ['@image1']), makeShot('S2', 'p2', ['@image2'])]);
    // S2 NO está aprobado, pero su ref @image2 sigue contando para el resaltado.
    (component as any).approvedMap['S1'] = true;
    (component as any).approvedTick.update((n: number) => n + 1);

    expect((component as any).allUnresolvedRefs().map((r: any) => r.slot).sort()).toEqual([
      '@image1',
      '@image2',
    ]);
  });
});
