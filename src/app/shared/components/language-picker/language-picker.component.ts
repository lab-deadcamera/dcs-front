import { Component, inject, ChangeDetectionStrategy } from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'
import { SessionStore } from '@app/core/stores/session.store'

@Component({
  selector: 'app-language-picker',
  imports: [TranslatePipe],
  templateUrl: './language-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguagePicker {
  protected readonly session = inject(SessionStore)
}
