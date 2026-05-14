import { Component, inject, ChangeDetectionStrategy, ViewChild } from '@angular/core'
import { Popover } from 'primeng/popover'
import { ButtonModule } from 'primeng/button'
import { TranslatePipe } from '@ngx-translate/core'
import { ThemeService } from '@core/theme/theme.service'
import { LanguagePicker } from '@shared/components/language-picker/language-picker.component'

@Component({
  selector: 'app-theme-picker',
  imports: [Popover, ButtonModule, TranslatePipe, LanguagePicker],
  templateUrl: './theme-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemePicker {
  protected readonly theme = inject(ThemeService)

  @ViewChild('popover') protected readonly popover!: Popover
}