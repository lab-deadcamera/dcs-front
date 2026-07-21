import { Pipe, type PipeTransform } from '@angular/core';
import { filterTable } from '@app/shared/utils';

@Pipe({
  name: 'filterTable',
})
export class FilterTablePipe<T> implements PipeTransform {
  transform(data: T[], search: string, page = 1, length = 10): T[] {
    const startIndex = (page - 1) * length;
    const endIndex = startIndex + length;
    if (!search || typeof search != 'string') return data.slice(startIndex, endIndex);
    return filterTable(data as Record<string, any>[], search, 0, length * 2) as T[];
  }
}
