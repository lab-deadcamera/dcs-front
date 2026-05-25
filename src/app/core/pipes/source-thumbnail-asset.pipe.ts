import { Pipe, type PipeTransform } from '@angular/core';
import { environment } from '@environment/environment';

@Pipe({
  name: 'sourceThumbnailAsset',
})
export class SourceThumbnailAssetPipe implements PipeTransform {
  private readonly apiUrl = environment.API_URL + '/files';

  transform(id: string | undefined): string {
    if (!id) return '';
    return `${this.apiUrl}/${id}/thumbnail`;
  }
}
