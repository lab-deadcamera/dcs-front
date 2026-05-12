/**
 * Domain types for the Files feature.
 *
 * Mirrors the backend contract from
 * dcs-back/docs/use-cases/upload-temp.md, upload-persistent.md, and
 * add-files-to-character.md:
 *
 *   POST   /api/v1/files/upload                    multipart form
 *   GET    /api/v1/files?category=&storage=        list
 *   GET    /api/v1/files/{id}                      metadata
 *   GET    /api/v1/files/{id}/serve                raw content (img/video)
 *   DELETE /api/v1/files/{id}                      soft delete → trash
 *   POST   /api/v1/files/{id}/restore              from persistent trash
 *   POST   /api/v1/files/{id}/recover-temp         from temp trash
 *   DELETE /api/v1/files/{id}/hard                 hard delete
 *   GET    /api/v1/files/trash                     trashed list
 *
 *   POST   /api/v1/characters/{cid}/files          { file_id, role }
 *   GET    /api/v1/characters/{cid}/files          list
 *   DELETE /api/v1/characters/{cid}/files/{fid}    unassign
 */

export type FileCategory = 'images' | 'videos' | 'audio' | 'temp';
export type FileStorage = 'persistent' | 'temp';

/** Standard roles documented in the use case — extensible to custom strings. */
export type CharacterFileRole = 'reference' | 'portrait' | 'asset' | string;

/** File as the rest of the app consumes it (camelCase + computed serveUrl). */
export interface FileEntity {
  id: string;
  filename: string;
  url: string;          // GET /files/{id}/serve — usable as <img src>
  size: number;
  mimeType: string;
  format: string;
  category: FileCategory;
  storage: FileStorage;
  createdAt?: string;
  deletedAt?: string | null;
}

/** Raw wire shape returned by the backend (snake_case). */
export interface FileWire {
  id: string;
  filename: string;
  url?: string;
  size: number;
  mime_type: string;
  format: string;
  category: FileCategory;
  storage: FileStorage;
  created_at?: string;
  deleted_at?: string | null;
}

export interface UploadParams {
  file: File;
  category: FileCategory;
  storage: FileStorage;
}

export interface CharacterFileLink {
  fileId: string;
  role: CharacterFileRole;
  createdAt: string;
}

export interface CharacterFileLinkWire {
  file_id: string;
  role: CharacterFileRole;
  created_at: string;
}
