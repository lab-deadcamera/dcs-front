/**
 * Domain types for the Characters feature.
 *
 * Mirrors the backend contract from
 * dcs-back/docs/use-cases/create-characters.md:
 *
 *   POST   /api/v1/characters
 *   GET    /api/v1/characters
 *   GET    /api/v1/characters/{id}   → { character, files }
 *   PATCH  /api/v1/characters/{id}
 *   DELETE /api/v1/characters/{id}   (soft delete)
 *
 * The backend stores `metadata` as a JSONB column but transports it on the
 * wire as a STRINGIFIED JSON. The API service is responsible for parsing
 * on read and stringifying on write so the rest of the codebase only ever
 * deals with `CharacterMetadata` objects.
 */

export interface CharacterMetadata {
  age?: number;
  style?: string;
  gender?: 'male' | 'female' | 'other' | string;
  /** Any extra ad-hoc fields the backend may accept. */
  [key: string]: unknown;
}

/** Character as the rest of the app consumes it (metadata parsed). */
export interface Character {
  id: string;
  name: string;
  description: string;
  metadata: CharacterMetadata;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Raw wire shape returned by the backend (metadata stringified). */
export interface CharacterWire {
  id: string;
  name: string;
  description: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Detail payload returned by GET /characters/{id}. */
export interface CharacterDetailWire {
  character: CharacterWire;
  files: CharacterFile[];
}

export interface CharacterFile {
  id: string;
  filename: string;
  url?: string;
}

/** Domain shape returned by GET /characters/{id}/files. */
export interface CharacterFileLinkView {
  fileId: string;
  role: string;
  createdAt: string;
}

/** Raw wire of the same. */
export interface CharacterFileLinkWire {
  file_id: string;
  role: string;
  created_at: string;
}

/** Payload accepted by POST /characters. */
export interface CreateCharacterRequest {
  name: string;
  description: string;
  metadata?: CharacterMetadata;
}

/** Payload accepted by PATCH /characters/{id} — both fields optional. */
export interface UpdateCharacterRequest {
  name?: string;
  description?: string;
}
