import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-logout',
  imports: [],
  template: `<p>logout works!</p>`,
  styleUrl: './logout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LogoutComponent { }
