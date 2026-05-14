export type AssetType = 'character' | 'location' | 'prop';

export type AssetFileKind = 'image' | 'video' | 'audio' | 'mixed';

export type CharacterFileRole = 'reference' | 'portrait' | 'asset';

export interface CharacterMetadata {
  assetType?: AssetType;
  fileKind?: AssetFileKind;
  age?: number;
  style?: string;
  gender?: 'male' | 'female' | 'other' | string;
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

/** File linked to a character — rich metadata from GET /characters/{id}/files. */
export interface CharacterFile {
  file_id: string;
  role: string;
  filename: string;
  url: string;
  thumbnail_url: string;
  mime_type: string;
  category: string;
  format: string;
  size: number;
  created_at: string;
}

/** Payload returned by GET /characters and GET /characters/{id}. */
export interface CharacterWithFiles {
  character: CharacterWire;
  files: CharacterFile[];
}

/** Payload accepted by POST /characters. */
export interface CreateCharacterRequest {
  name: string;
  description: string;
  metadata?: CharacterMetadata;
}

/** Payload accepted by PATCH /characters/{id}. */
export interface UpdateCharacterRequest {
  name?: string;
  description?: string;
}
