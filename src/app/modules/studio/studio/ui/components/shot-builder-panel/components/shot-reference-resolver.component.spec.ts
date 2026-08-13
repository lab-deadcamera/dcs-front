import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { describe, beforeEach, beforeAll, it, expect, vi } from 'vitest';

import { StudioStore } from '@app/core/stores/studio.store';
import { ProjectsApiService } from '@app/modules/projects/projects/services/projects-api.service';
import { FilesApiService } from '@app/services/files-api.service';
import { CharactersService } from '@app/modules/characters/characters/services';
import { MessageService } from 'primeng/api';
import { Reference } from '@app/core/interfaces';
import type { ShotReferenceResolverComponent } from './shot-reference-resolver.component';

// ─── Test doubles ──────────────────────────────────────────────────────

@Injectable()
class StudioStoreStub {
  readonly projectId = vi.fn().mockReturnValue('proj-1');
  readonly chapterId = vi.fn().mockReturnValue('chap-1');
  readonly chapterCharacterData = vi.fn().mockReturnValue([]);
  readonly freeAssets = vi.fn().mockReturnValue([]);
  readonly chapterAssetSlots = vi.fn().mockReturnValue(new Map());
  readonly chapterAssetAssignmentIds = vi.fn().mockReturnValue(new Map());
  readonly chapterCharacterAssignmentIds = vi.fn().mockReturnValue(new Map());
  readonly addFreeAsset = vi.fn();
  readonly registerChapterAssetAssignment = vi.fn();
  readonly setChapterAssignments = vi.fn();
}

@Injectable()
class ProjectsApiServiceStub {
  readonly assignAssetToChapter = vi.fn().mockReturnValue(of({ success: true, data: { id: 'a-1' } }));
  readonly removeAssetFromChapter = vi.fn().mockReturnValue(of({ success: true }));
  readonly getChapterAssignments = vi.fn().mockReturnValue(of({ success: true, data: {} }));
}

@Injectable()
class FilesApiServiceStub {
  readonly upload = vi.fn();
  readonly serveUrl = vi.fn((id: string) => `/api/v1/files/${id}/serve`);
}

@Injectable()
class CharactersServiceStub {
  readonly items = vi.fn().mockReturnValue([]);
  readonly loading = vi.fn().mockReturnValue(false);
  readonly searchQuery = vi.fn().mockReturnValue('');
  readonly setSearchQuery = vi.fn();
  readonly load = vi.fn().mockReturnValue(of({ error: false, msg: '', data: {} }));
}

function makeRef(partial: Partial<Reference> = {}): Reference {
  return { slot: '[Image1]', assetId: 'xxx', type: 'character', ...partial };
}

// ─── Suite ─────────────────────────────────────────────────────────────

describe('ShotReferenceResolverComponent', () => {
  let ComponentClass: typeof ShotReferenceResolverComponent;
  let fixture: ComponentFixture<ShotReferenceResolverComponent>;
  let component: ShotReferenceResolverComponent;
  let studio: StudioStoreStub;
  let projects: ProjectsApiServiceStub;
  let files: FilesApiServiceStub;

  beforeAll(async () => {
    ({ ShotReferenceResolverComponent: ComponentClass } = await import(
      './shot-reference-resolver.component'
    ));
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: StudioStore, useClass: StudioStoreStub },
        { provide: ProjectsApiService, useClass: ProjectsApiServiceStub },
        { provide: FilesApiService, useClass: FilesApiServiceStub },
        { provide: CharactersService, useClass: CharactersServiceStub },
        { provide: MessageService, useValue: { add: vi.fn() } },
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
    projects = TestBed.inject(ProjectsApiService) as unknown as ProjectsApiServiceStub;
    files = TestBed.inject(FilesApiService) as unknown as FilesApiServiceStub;

    fixture = TestBed.createComponent(ComponentClass);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('projectId', 'proj-1');
    fixture.componentRef.setInput('chapterId', 'chap-1');
    fixture.detectChanges();
    // The real template is overridden with a stub, so Angular's ViewChild query
    // finds no popover. Provide a fake popover AFTER detectChanges so handlers
    // that call toggle()/hide() work.
    (component as any).assignPopover = { toggle: vi.fn(), hide: vi.fn() };
  });

  it('clasifica una referencia como no resuelta según el input unresolved', () => {
    const ref = makeRef({ slot: '[Image1]', assetId: 'missing' });
    fixture.componentRef.setInput('references', [ref]);
    fixture.componentRef.setInput('unresolved', [ref]);
    fixture.detectChanges();

    expect((component as any).isUnresolvedRef(ref)).toBe(true);
  });

  it('asigna un free asset con el slot de la referencia y refresca assignments', () => {
    const ref = makeRef({ slot: '[Image3]', assetId: 'missing' });
    (component as any).assignTarget.set(ref);

    (component as any).assignFile('file-1', ref.slot);

    expect(projects.assignAssetToChapter).toHaveBeenCalledWith('proj-1', 'chap-1', 'file-1', '[Image3]');
    expect(projects.getChapterAssignments).toHaveBeenCalledWith('proj-1', 'chap-1');
    expect(studio.setChapterAssignments).toHaveBeenCalled();
  });

  it('marca el slot como asignado y emite assignedSlotsChange tras asignar', () => {
    const ref = makeRef({ slot: '[Image6]', assetId: 'missing' });
    const emitted: Set<string>[] = [];
    (component as any).assignedSlotsChange.subscribe((s: Set<string>) => emitted.push(s));
    (component as any).assignTarget.set(ref);

    // Antes de asignar, la ref está unresolved según el input.
    fixture.componentRef.setInput('unresolved', [ref]);
    fixture.detectChanges();
    expect((component as any).isUnresolvedRef(ref)).toBe(true);

    (component as any).assignFile('file-1', ref.slot);

    // Tras asignar, deja de estar unresolved y se notificó al viewer.
    expect((component as any).isUnresolvedRef(ref)).toBe(false);
    expect(emitted.length).toBe(1);
    expect(emitted[0].has('[Image6]')).toBe(true);
  });

  it('no hace nada cuando el asset ya tiene el slot destino', () => {
    const ref = makeRef({ slot: '[Image2]', assetId: 'missing' });
    studio.chapterAssetSlots.mockReturnValue(new Map([['file-1', '[Image2]']]));
    (component as any).assignTarget.set(ref);

    (component as any).assignFile('file-1', ref.slot);

    expect(projects.removeAssetFromChapter).not.toHaveBeenCalled();
    expect(projects.assignAssetToChapter).not.toHaveBeenCalled();
  });

  it('reasigna (remove + assign) cuando el asset ya tiene OTRO slot', () => {
    const ref = makeRef({ slot: '[Image4]', assetId: 'missing' });
    studio.chapterAssetSlots.mockReturnValue(new Map([['file-1', '[Image1]']]));
    studio.chapterAssetAssignmentIds.mockReturnValue(new Map([['file-1', 'assign-old']]));
    (component as any).assignTarget.set(ref);

    (component as any).assignFile('file-1', ref.slot);

    expect(projects.removeAssetFromChapter).toHaveBeenCalledWith('proj-1', 'chap-1', 'assign-old');
    // The assign happens in the remove's subscribe (synchronous of()).
    expect(projects.assignAssetToChapter).toHaveBeenCalledWith('proj-1', 'chap-1', 'file-1', '[Image4]');
  });

  it('sube un free asset y lo asigna con el slot de la referencia', () => {
    const ref = makeRef({ slot: '[Image5]', assetId: 'missing' });
    files.upload.mockReturnValue(
      of({ error: false, msg: 'ok', data: { id: 'file-9', filename: 'nuevo.png' } }),
    );
    const file = new File([new Uint8Array([1])], 'nuevo.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as unknown as Event;

    (component as any).onUploadSelected(event, ref.slot);

    expect(files.upload).toHaveBeenCalledWith({ file, category: 'images', storage: 'persistent' });
    expect(studio.addFreeAsset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'file-9', kind: 'image', filename: 'nuevo.png' }),
    );
    expect(projects.assignAssetToChapter).toHaveBeenCalledWith('proj-1', 'chap-1', 'file-9', '[Image5]');
    expect(projects.getChapterAssignments).toHaveBeenCalled();
  });
});
