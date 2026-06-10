import { Pipe, type PipeTransform } from '@angular/core';
import { RESOLVE_URL } from '@app/shared/utils';

@Pipe({
  name: 'resolveUrl',
})
export class ResolveUrlPipe implements PipeTransform {
  transform(path: string | undefined): string {
    return RESOLVE_URL(path);
  }
}
