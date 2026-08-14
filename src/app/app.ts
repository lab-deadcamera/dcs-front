import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PushNotificationService } from '@services/push-notification.service';
import { CONSOLE } from './shared/utils';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private push = inject(PushNotificationService);

  constructor() {
    this.push.init({
      onMessage: (message) => {
        CONSOLE.info('[push] mensaje recibido:', message);
      },
      onNotificationClick: ({ notification }) => {
        CONSOLE.info('[push] click en notificación:', notification);
      },
    });
  }
}
