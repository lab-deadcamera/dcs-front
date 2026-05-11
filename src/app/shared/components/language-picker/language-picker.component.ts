import { Component, inject, ChangeDetectionStrategy } from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'
import { TranslationService } from '@services/translation.service'

@Component({
  selector: 'app-language-picker',
  imports: [TranslatePipe],
  templateUrl: './language-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguagePicker {
  protected readonly i18n = inject(TranslationService)
}
