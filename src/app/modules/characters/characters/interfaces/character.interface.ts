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

/**
 * The library is split into three buckets by `metadata.assetType`. The
 * backend stores everything in the same `characters` table — the type
 * lives in the JSONB metadata column, so no schema migration is needed.
 */
export type AssetType = 'character' | 'location' | 'prop';

/**
 * Aggregated file type of the asset's linked files — drives the icon
 * shown in the prompt's reference chips. Resolved at creation time
 * from the staged uploads and stored in `metadata.fileKind`.
 */
export type AssetFileKind = 'image' | 'video' | 'audio' | 'mixed';

export interface CharacterMetadata {
  /** Bucket the asset lives in. Defaults to `character` for legacy rows. */
  assetType?: AssetType;
  /** Type of the files attached to this asset (image / video / audio / mixed). */
  fileKind?: AssetFileKind;
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
  /**
   * Files attached to this character — populated by the list / detail
   * endpoints that embed file metadata inline. Empty/undefined when fetched
   * through pathways that don't include files (e.g. POST create response).
   */
  files?: CharacterFile[];
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

/**
 * Legacy detail wire shape — kept as a type alias for the new envelope so
 * call sites that imported it continue to compile. Prefer
 * `CharacterDetailResponseWire` going forward.
 */
export type CharacterDetailWire = CharacterListItemWire;

/**
 * File attached to a character. The list endpoint and `GET /characters/{id}`
 * embed the full file metadata inline, so this shape now mirrors the wire
 * payload (camelCased). Use `thumbnailUrl` (when `category === 'images'`)
 * for card previews; `url` is the full-quality serve URL.
 */
export interface CharacterFile {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  category?: 'images' | 'videos' | 'audio' | 'temp' | string;
  format?: string;
  size?: number;
  role?: string;
  createdAt?: string;
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

/** Full file metadata as it arrives nested inside list / detail responses. */
export interface CharacterFileWire {
  file_id: string;
  role?: string;
  filename: string;
  url: string;
  thumbnail_url?: string;
  mime_type?: string;
  category?: string;
  format?: string;
  size?: number;
  created_at?: string;
}

/** Each row of GET /characters carries the character + its linked files. */
export interface CharacterListItemWire {
  character: CharacterWire;
  files: CharacterFileWire[];
}

/** Envelope used by GET /characters. */
export interface CharacterListResponseWire {
  data: CharacterListItemWire[];
  message: string;
  success: boolean;
}

/** Envelope used by GET /characters/{id}. */
export interface CharacterDetailResponseWire {
  data: CharacterListItemWire;
  message: string;
  success: boolean;
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
