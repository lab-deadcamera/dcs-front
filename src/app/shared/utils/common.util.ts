import { ReferenceAsset } from '@app/core/interfaces';

export const inferKind = (file: File): ReferenceAsset['kind'] => {
  if (file.type.startsWith('video')) return 'video';
  if (file.type.startsWith('audio')) return 'audio';
  return 'image';
};
