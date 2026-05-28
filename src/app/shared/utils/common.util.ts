import { ReferenceAsset } from '@app/core/interfaces';
import { environment } from '@environment/environment';

export const API_URL = environment.API_URL + '/files';
export const BASE_URL = environment.API_BASE_URL;

export const inferKind = (file: File): ReferenceAsset['kind'] => {
  if (file.type.startsWith('video')) return 'video';
  if (file.type.startsWith('audio')) return 'audio';
  return 'image';
};

export const GENERATE_URL_FILE = (id: string) => `${API_URL}/${id}/serve`;
export const GENERATE_URL_THUMBNAIL = (id: string) => `${API_URL}/${id}/thumbnail`;

export const RESOLVE_URL = (path: string | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return BASE_URL + path;
  return BASE_URL + '/' + path;
};
