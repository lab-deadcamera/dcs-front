import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemePicker } from './theme/theme-picker/theme-picker.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ThemePicker],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
