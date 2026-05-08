import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-language-picker',
  template: `
    <div class="flex items-center gap-1">
      @for (lang of languages; track lang.code) {
        <button class="px-2 py-1 text-xs font-medium rounded transition-colors"></button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguagePicker {

  protected readonly languages: { code: string; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' },
  ];
}
