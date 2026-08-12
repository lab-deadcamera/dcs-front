import { Reference } from '@app/core/interfaces';

/** Metadata of the asset a reference resolves to — a chapter character or a
 *  free asset. `kind` discriminates them in the info popover. */
export type ResolvedRefInfo =
  | {
      kind: 'character';
      name: string;
      charId: string;
      fileId: string;
      slot: string;
      fileKind: string;
    }
  | { kind: 'asset'; name: string; fileId: string; slot: string; fileKind: string };

/** Minimal shapes the resolver accepts for chapter characters and free assets,
 *  so callers can pass whatever slice of the store they hold. */
interface CharacterLike {
  id: string;
  name: string;
  slot: string;
  fileId: string;
  kind: string;
}

interface FreeAssetLike {
  id: string;
  kind: 'image' | 'video' | 'audio';
  filename: string;
}

const key = (s: string): string => s.trim().toLowerCase();

/** Resolve a reference's assetId to a chapter character or free asset, matched
 *  by id, file id, name/filename (case-insensitive). Returns null when it
 *  doesn't match anything in the episode. */
export function resolveReferenceInfo(
  ref: Reference,
  characters: CharacterLike[],
  freeAssets: FreeAssetLike[],
  assetSlots: Map<string, string>,
): ResolvedRefInfo | null {
  const id = ref.assetId;
  const char = characters.find(
    (c) => key(c.id) === key(id) || key(c.fileId) === key(id) || key(c.name) === key(id),
  );
  if (char) {
    return {
      kind: 'character',
      name: char.name,
      charId: char.id,
      fileId: char.fileId,
      slot: char.slot || assetSlots.get(char.fileId) || '',
      fileKind: char.kind,
    };
  }
  const asset = freeAssets.find(
    (a) => key(a.id) === key(id) || key(a.filename) === key(id),
  );
  if (asset) {
    return {
      kind: 'asset',
      name: asset.filename,
      fileId: asset.id,
      slot: assetSlots.get(asset.id) || '',
      fileKind: asset.kind,
    };
  }
  return null;
}
