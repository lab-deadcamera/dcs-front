import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { PushNotificationService } from '@services/push-notification.service';
import { CONSOLE } from '@app/shared/utils';

/**
 * Monitor — estado de integraciones, servicios y API del backend.
 * Hoy contiene la sección de notificaciones push: estado de la suscripción
 * del navegador, suscribir/desuscribir y envío de una notificación de prueba
 * (POST /push/test) para validar toda la cadena VAPID → push service → SW.
 * El layout por tarjetas está pensado para que nuevas secciones (estado de
 * la API, integraciones BytePlus, etc.) se agreguen sin tocar el resto.
 */
@Component({
  selector: 'app-monitor',
  imports: [TranslatePipe, FormsModule, ButtonModule, InputTextModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './monitor.component.html',
})
export class MonitorComponent {
  private readonly push = inject(PushNotificationService);

  // ── Push notification status ──────────────────────────────────────
  protected readonly pushSupported = this.push.isSupported;
  protected readonly pushPermission = this.push.permission;
  protected readonly pushSubscribed = this.push.isSubscribed;
  protected readonly pushBusy = this.push.isBusy;
  protected readonly pushConfigured = computed(() => this.push.canEnable());
  protected readonly pushEndpoint = computed(() => this.push.subscription()?.endpoint ?? '');

  /** Custom body for the test notification. */
  protected readonly testMessage = signal('This is a test notification');
  /** Brief feedback after sending the test: 'idle' | 'sent' | 'no-subscription' | 'error'. */
  protected readonly testState = signal<'idle' | 'sent' | 'no-subscription' | 'error'>('idle');

  protected async toggleSubscription(): Promise<void> {
    CONSOLE.log('toggleSubscription');
    if (this.pushSubscribed()) {
      await this.push.unsubscribe();
    } else {
      await this.push.subscribe();
    }
  }

  protected async sendTest(): Promise<void> {
    if (this.pushBusy()) return;
    const state = await this.push.sendTest(this.testMessage());
    this.testState.set(state);
    setTimeout(() => this.testState.set('idle'), 4000);
  }
}
