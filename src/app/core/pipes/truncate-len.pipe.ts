import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncateLen',
})
export class TruncateLenPipe implements PipeTransform {
  transform(value: string, length: number = 40): string {
    if (value.length <= length) {
      return value;
    }
    return value.slice(0, length) + '...';
  }
}
