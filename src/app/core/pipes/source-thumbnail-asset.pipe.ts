import { Pipe, type PipeTransform } from '@angular/core';
import { GENERATE_URL_THUMBNAIL } from '@app/shared/utils';

@Pipe({
  name: 'sourceThumbnailAsset',
})
export class SourceThumbnailAssetPipe implements PipeTransform {
  transform(id: string | undefined): string {
    if (!id) return '';
    return GENERATE_URL_THUMBNAIL(id);
  }
}
