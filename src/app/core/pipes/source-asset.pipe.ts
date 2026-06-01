import { Pipe, type PipeTransform } from '@angular/core';
import { GENERATE_URL_FILE } from '@app/shared/utils';

@Pipe({
  name: 'sourceAsset',
})
export class SourceAssetPipe implements PipeTransform {
  transform(id: string | undefined): string {
    if (!id) return '';
    return GENERATE_URL_FILE(id);
  }
}
