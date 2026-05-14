import { CharacterWire, Character } from '@app/modules/characters/characters/interfaces';

export const toCharacter = (w: CharacterWire): Character => {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    metadata: parseMetadata(w.metadata),
    createdAt: w.created_at,
    updatedAt: w.updated_at,
    deletedAt: w.deleted_at,
  };
};

export const parseMetadata = (raw: string | null): Character['metadata'] => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};
