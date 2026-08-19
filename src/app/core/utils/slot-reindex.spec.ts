import { describe, expect, it } from 'vitest';
import { UsedAsset } from '@core/interfaces/studio.models';
import {
  buildSlotReferences,
  collectSlotTokensInOrder,
  reindexSlotTokens,
  replaceSlotToken,
} from './slot-reindex';

function used(overrides: Partial<UsedAsset>): UsedAsset {
  return {
    fileId: 'f',
    characterId: 'c',
    name: 'asset',
    filename: 'asset.png',
    kind: 'image',
    ...overrides,
  };
}

describe('reindexSlotTokens', () => {
  it('reindexes every occurrence to positional numbers in refs order', () => {
    const refs = [
      { fileId: 'a', kind: 'image' as const, slot: '[Image4]' },
      { fileId: 'b', kind: 'image' as const, slot: '[Image7]' },
    ];
    expect(reindexSlotTokens('[Image4] [Image7] then [Image4] again', refs)).toBe(
      '[Image1] [Image2] then [Image1] again',
    );
  });

  it('reindexes per kind independently (video/audio are their own sequence)', () => {
    const refs = [
      { fileId: 'a', kind: 'audio' as const, slot: '[Audio2]' },
      { fileId: 'b', kind: 'audio' as const, slot: '[Audio4]' },
      { fileId: 'v', kind: 'video' as const, slot: '[Video1]' },
    ];
    expect(reindexSlotTokens('[Audio2] [Audio4] [Video1]', refs)).toBe(
      '[Audio1] [Audio2] [Video1]',
    );
  });

  it('leaves tokens that match no used asset untouched', () => {
    const refs = [{ fileId: 'a', kind: 'image' as const, slot: '[Image4]' }];
    expect(reindexSlotTokens('[Image9] [Image4]', refs)).toBe('[Image9] [Image1]');
  });

  it('matches case-insensitively', () => {
    const refs = [{ fileId: 'a', kind: 'image' as const, slot: '[Image4]' }];
    expect(reindexSlotTokens('[image4]', refs)).toBe('[Image1]');
  });

  it('is a no-op when no ref carries a slot', () => {
    const refs = [{ fileId: 'a', kind: 'image' as const }];
    expect(reindexSlotTokens('[Image4] text', refs)).toBe('[Image4] text');
  });

  it('is a no-op when there are no tokens', () => {
    const refs = [{ fileId: 'a', kind: 'image' as const, slot: '[Image4]' }];
    expect(reindexSlotTokens('plain prompt', refs)).toBe('plain prompt');
  });

  it('reproduces the user case: [Image2] [Image3] [Image5] → [Image1] [Image2] [Image3]', () => {
    // Chapter assignments: [Image2]=dixie_15, [Image3]=dixie_adult, [Image5]=wyatt_kitchen_plate.
    const refs = [
      { fileId: 'dixie15', kind: 'image' as const, slot: '[Image2]' },
      { fileId: 'dixieAdult', kind: 'image' as const, slot: '[Image3]' },
      { fileId: 'kitchenPlate', kind: 'image' as const, slot: '[Image5]' },
    ];
    const raw =
      '[Image2] [Image3] [Image5]\n\nScene and Mood: A man ([Image2]) moves rapidly back and forth. ' +
      'A woman ([Image3]) sits at the table. The [Image5] plate grounds the kitchen geometry. ' +
      'Dialogue: ... the man with the restless hands ([Image2]). Ending Shot: Man ([Image2]) stopped. ' +
      "Environmental Base: [Image5] — Wyatt's kitchen.";
    const expected =
      '[Image1] [Image2] [Image3]\n\nScene and Mood: A man ([Image1]) moves rapidly back and forth. ' +
      'A woman ([Image2]) sits at the table. The [Image3] plate grounds the kitchen geometry. ' +
      'Dialogue: ... the man with the restless hands ([Image1]). Ending Shot: Man ([Image1]) stopped. ' +
      "Environmental Base: [Image3] — Wyatt's kitchen.";
    expect(reindexSlotTokens(raw, refs)).toBe(expected);
  });
});

describe('collectSlotTokensInOrder', () => {
  it('returns distinct tokens in order of first appearance', () => {
    expect(collectSlotTokensInOrder('[Image4] [Image3] [Image5] and again [Image4]')).toEqual([
      '[image4]',
      '[image3]',
      '[image5]',
    ]);
  });

  it('preserves the exact first-appearance order of the prompt', () => {
    expect(collectSlotTokensInOrder('[Image2] then [Image4] then [Image5]')).toEqual([
      '[image2]',
      '[image4]',
      '[image5]',
    ]);
  });

  it('is case-insensitive and lowercases the result', () => {
    expect(collectSlotTokensInOrder('[Image4] [IMAGE3]')).toEqual(['[image4]', '[image3]']);
  });

  it('mixes kinds independently', () => {
    expect(collectSlotTokensInOrder('[Image2] [Audio1] [Image4] [Video1]')).toEqual([
      '[image2]',
      '[audio1]',
      '[image4]',
      '[video1]',
    ]);
  });

  it('returns empty array when there are no tokens', () => {
    expect(collectSlotTokensInOrder('plain prompt text')).toEqual([]);
    expect(collectSlotTokensInOrder('')).toEqual([]);
  });
});

describe('buildSlotReferences', () => {
  it('orders first frame, last frame, then used assets', () => {
    const first = { id: 'ff', kind: 'image' as const };
    const last = { id: 'lf', kind: 'image' as const };
    const usedAssets = [used({ fileId: 'u1' }), used({ fileId: 'u2' })];
    const refs = buildSlotReferences(first, last, usedAssets);
    expect(refs.map((r) => r.fileId)).toEqual(['ff', 'lf', 'u1', 'u2']);
  });

  it('dedupes by fileId (first wins)', () => {
    const first = { id: 'same', kind: 'image' as const };
    const usedAssets = [used({ fileId: 'same' })];
    const refs = buildSlotReferences(first, null, usedAssets);
    expect(refs).toHaveLength(1);
    expect(refs[0].fileId).toBe('same');
  });

  it('maps mixed kind to image and keeps the inherited slot', () => {
    const usedAssets = [used({ fileId: 'm', kind: 'mixed', slot: '[Image4]' })];
    const refs = buildSlotReferences(null, null, usedAssets);
    expect(refs[0]).toEqual({ fileId: 'm', kind: 'image', slot: '[Image4]' });
  });

  it('handles null first/last frames', () => {
    const refs = buildSlotReferences(null, null, [used({ fileId: 'u1', slot: '[Image2]' })]);
    expect(refs).toEqual([{ fileId: 'u1', kind: 'image', slot: '[Image2]' }]);
  });

  it('orders per kind across the whole list (offset by first/last)', () => {
    const first = { id: 'ff', kind: 'image' as const };
    const usedAssets = [used({ fileId: 'u1', kind: 'image', slot: '[Image3]' })];
    const refs = buildSlotReferences(first, null, usedAssets);
    // first frame occupies image position 1, so the used asset is position 2.
    const text = reindexSlotTokens('[Image3]', refs);
    expect(text).toBe('[Image2]');
  });
});

describe('replaceSlotToken', () => {
  it('replaces every occurrence of the exact token', () => {
    expect(replaceSlotToken('Mira a [Image1] y luego a [Image1] otra vez', '[Image1]', '[Image5]')).toBe(
      'Mira a [Image5] y luego a [Image5] otra vez',
    );
  });

  it('matches case-insensitively', () => {
    expect(replaceSlotToken('plano [image1] final', '[Image1]', '[Image2]')).toBe(
      'plano [Image2] final',
    );
  });

  it('does not corrupt tokens with more digits ([Image11])', () => {
    expect(replaceSlotToken('[Image1] y [Image11]', '[Image1]', '[Image5]')).toBe(
      '[Image5] y [Image11]',
    );
  });

  it('is a no-op without a valid old slot', () => {
    expect(replaceSlotToken('hola [Image1]', 'no-slot', '[Image5]')).toBe('hola [Image1]');
    expect(replaceSlotToken('hola [Image1]', '[Image1]', '')).toBe('hola [Image1]');
  });
});
