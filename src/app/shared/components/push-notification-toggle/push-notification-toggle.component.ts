import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import { PushNotificationService } from '@services/push-notification.service';

/**
 * Bell toggle that subscribes / unsubscribes the current device for Web Push.
 * Hidden when push is unsupported or not configured (missing VAPID key).
 * Clicking while off asks for notification permission and registers the
 * device; clicking while on removes the subscription.
 */
@Component({
  selector: 'app-push-notification-toggle',
  imports: [TranslatePipe, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './push-notification-toggle.component.html',
  styleUrl: './push-notification-toggle.component.css',
})
export class PushNotificationToggleComponent {
  private readonly push = inject(PushNotificationService);

  protected readonly canEnable = computed(() => this.push.canEnable());
  protected readonly isSubscribed = this.push.isSubscribed;
  protected readonly isBusy = this.push.isBusy;

  protected async toggle(): Promise<void> {
    if (this.isSubscribed()) {
      await this.push.unsubscribe();
    } else {
      await this.push.subscribe();
    }
  }
}
