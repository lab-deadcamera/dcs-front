import { inject, Injectable } from '@angular/core';
import { FilesApiService } from '@app/services';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private api = inject(FilesApiService);
}
