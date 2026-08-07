import { describe, expect, it } from 'vitest';
import { UsedAsset } from '@core/interfaces/studio.models';
import {
  buildSlotReferences,
  collectSlotTokensInOrder,
  reindexSlotTokens,
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
      { fileId: 'a', kind: 'image' as const, slot: '@image4' },
      { fileId: 'b', kind: 'image' as const, slot: '@image7' },
    ];
    expect(reindexSlotTokens('@image4 @image7 then @image4 again', refs)).toBe(
      '@image1 @image2 then @image1 again',
    );
  });

  it('reindexes per kind independently (video/audio are their own sequence)', () => {
    const refs = [
      { fileId: 'a', kind: 'audio' as const, slot: '@audio2' },
      { fileId: 'b', kind: 'audio' as const, slot: '@audio4' },
      { fileId: 'v', kind: 'video' as const, slot: '@video1' },
    ];
    expect(reindexSlotTokens('@audio2 @audio4 @video1', refs)).toBe('@audio1 @audio2 @video1');
  });

  it('leaves tokens that match no used asset untouched', () => {
    const refs = [{ fileId: 'a', kind: 'image' as const, slot: '@image4' }];
    expect(reindexSlotTokens('@image9 @image4', refs)).toBe('@image9 @image1');
  });

  it('matches case-insensitively', () => {
    const refs = [{ fileId: 'a', kind: 'image' as const, slot: '@image4' }];
    expect(reindexSlotTokens('@Image4', refs)).toBe('@image1');
  });

  it('is a no-op when no ref carries a slot', () => {
    const refs = [{ fileId: 'a', kind: 'image' as const }];
    expect(reindexSlotTokens('@image4 text', refs)).toBe('@image4 text');
  });

  it('is a no-op when there are no tokens', () => {
    const refs = [{ fileId: 'a', kind: 'image' as const, slot: '@image4' }];
    expect(reindexSlotTokens('plain prompt', refs)).toBe('plain prompt');
  });

  it('reproduces the user case: @image2 @image3 @image5 → @image1 @image2 @image3', () => {
    // Chapter assignments: @image2=dixie_15, @image3=dixie_adult, @image5=wyatt_kitchen_plate.
    const refs = [
      { fileId: 'dixie15', kind: 'image' as const, slot: '@image2' },
      { fileId: 'dixieAdult', kind: 'image' as const, slot: '@image3' },
      { fileId: 'kitchenPlate', kind: 'image' as const, slot: '@image5' },
    ];
    const raw =
      '@image2 @image3 @image5\n\nScene and Mood: A man (@image2) moves rapidly back and forth. ' +
      'A woman (@image3) sits at the table. The @image5 plate grounds the kitchen geometry. ' +
      'Dialogue: ... the man with the restless hands (@image2). Ending Shot: Man (@image2) stopped. ' +
      'Environmental Base: @image5 — Wyatt\'s kitchen.';
    const expected =
      '@image1 @image2 @image3\n\nScene and Mood: A man (@image1) moves rapidly back and forth. ' +
      'A woman (@image2) sits at the table. The @image3 plate grounds the kitchen geometry. ' +
      'Dialogue: ... the man with the restless hands (@image1). Ending Shot: Man (@image1) stopped. ' +
      'Environmental Base: @image3 — Wyatt\'s kitchen.';
    expect(reindexSlotTokens(raw, refs)).toBe(expected);
  });
});

describe('collectSlotTokensInOrder', () => {
  it('returns distinct tokens in order of first appearance', () => {
    expect(collectSlotTokensInOrder('@image4 @image3 @image5 and again @image4')).toEqual([
      '@image4',
      '@image3',
      '@image5',
    ]);
  });

  it('preserves the exact first-appearance order of the prompt', () => {
    expect(collectSlotTokensInOrder('@image2 then @image4 then @image5')).toEqual([
      '@image2',
      '@image4',
      '@image5',
    ]);
  });

  it('is case-insensitive and lowercases the result', () => {
    expect(collectSlotTokensInOrder('@Image4 @IMAGE3')).toEqual(['@image4', '@image3']);
  });

  it('mixes kinds independently', () => {
    expect(collectSlotTokensInOrder('@image2 @audio1 @image4 @video1')).toEqual([
      '@image2',
      '@audio1',
      '@image4',
      '@video1',
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
    const usedAssets = [used({ fileId: 'm', kind: 'mixed', slot: '@image4' })];
    const refs = buildSlotReferences(null, null, usedAssets);
    expect(refs[0]).toEqual({ fileId: 'm', kind: 'image', slot: '@image4' });
  });

  it('handles null first/last frames', () => {
    const refs = buildSlotReferences(null, null, [used({ fileId: 'u1', slot: '@image2' })]);
    expect(refs).toEqual([{ fileId: 'u1', kind: 'image', slot: '@image2' }]);
  });

  it('orders per kind across the whole list (offset by first/last)', () => {
    const first = { id: 'ff', kind: 'image' as const };
    const usedAssets = [used({ fileId: 'u1', kind: 'image', slot: '@image3' })];
    const refs = buildSlotReferences(first, null, usedAssets);
    // first frame occupies image position 1, so the used asset is position 2.
    const text = reindexSlotTokens('@image3', refs);
    expect(text).toBe('@image2');
  });
});
