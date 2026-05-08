import { Component, inject, ChangeDetectionStrategy } from '@angular/core'
import { NgIcon } from '@ng-icons/core'
import { ThemeService } from '@core/theme/theme.service'

@Component({
  selector: 'app-theme-picker',
  imports: [NgIcon],
  templateUrl: './theme-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemePicker {
  protected readonly theme = inject(ThemeService)
}
