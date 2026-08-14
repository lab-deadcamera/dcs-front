import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@environment/environment';
import { ResponseBase } from '@app/core/interfaces';
import { CONSOLE } from '@app/shared/utils';

export interface PushMessage {
  title?: string;
  body?: string;
  icon?: string;
  data?: Record<string, unknown>;
}

export interface PushNotificationClick {
  action: string;
  notification: NotificationOptions & { title: string };
}

/**
 * Fachada de notificaciones push (Web Push) con service worker de Angular.
 *
 * Responsabilidades:
 *  - Detectar soporte y permisos del navegador.
 *  - Suscribir/desuscribir el dispositivo con la VAPID public key.
 *  - Registrar/eliminar la suscripción en el backend (`/api/v1/push/subscriptions`).
 *  - Exponer estado reactivo (signals) y hooks para mensajes/clics.
 *
 * Uso rápido (componente):
 *   private push = inject(PushNotificationService);
 *
 *   // Al iniciar la app (ya se llama desde App):
 *   this.push.init();
 *
 *   // Botón "Activar notificaciones":
 *   const ok = await this.push.subscribe();
 *
 *   // Reaccionar a mensajes con la app abierta:
 *   this.push.onMessage((msg) => ...);
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush);

  private readonly apiUrl = `${environment.API_URL}/push/subscriptions`;
  private readonly testUrl = `${environment.API_URL}/push/test`;

  readonly isSupported = signal(this.detectSupport());
  readonly permission = signal<NotificationPermission | 'unsupported'>(
    this.getNotificationPermission(),
  );
  readonly subscription = signal<PushSubscriptionJSON | null>(null);
  readonly isSubscribed = signal(false);
  readonly isBusy = signal(false);

  private readonly enabled = environment.PUSH_ENABLED;
  private readonly vapidPublicKey = environment.PUSH_VAPID_PUBLIC_KEY;

  /**
   * Prepara el servicio una sola vez: escucha mensajes/clics, restaura la
   * suscripción del dispositivo y la re-registra en el backend si hace falta.
   * Llamar desde el bootstrap de la app (App.component).
   */
  init(opts?: {
    onMessage?: (message: PushMessage) => void;
    onNotificationClick?: (event: PushNotificationClick) => void;
  }): void {
    if (!this.canEnable()) return;

    this.swPush.messages.subscribe((message) => {
      const msg = message as PushMessage;
      opts?.onMessage?.(msg);
    });

    this.swPush.notificationClicks.subscribe((event) => {
      opts?.onNotificationClick?.(event);
    });

    // Restaura la suscripción del dispositivo y la re-registra si cambió.
    this.swPush.subscription.subscribe((sub) => {
      this.subscription.set(sub ? (sub.toJSON() as PushSubscriptionJSON) : null);
      this.isSubscribed.set(!!sub);
      if (sub) {
        void this.registerOnServer(sub.toJSON() as PushSubscriptionJSON);
      }
    });
  }

  /** ¿Este navegador/contexto puede usar push? */
  canEnable(): boolean {
    return this.enabled && this.isSupported() && !!this.vapidPublicKey && this.swPush.isEnabled;
  }

  /** Pide el permiso de notificaciones. Resuelve true si fue concedido. */
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    this.permission.set(permission);
    return permission === 'granted';
  }

  /**
   * Suscribe el dispositivo y lo registra en el backend.
   * Devuelve true si quedó suscrito y registrado.
   */
  async subscribe(): Promise<boolean> {
    if (!this.canEnable()) {
      CONSOLE.warn(
        '[PushNotificationService] Push no disponible: revisa PUSH_ENABLED, PUSH_VAPID_PUBLIC_KEY y que el SW esté activo.',
      );
      return false;
    }

    if (this.isSubscribed()) return true;

    const granted = this.permission() === 'granted' || (await this.requestPermission());
    if (!granted) return false;

    try {
      this.isBusy.set(true);
      // The browser's pushManager.subscribe() can hang silently when the SW is
      // installed but the page is not yet controlled by it (common right after
      // a deploy). Guard with a timeout so the UI never spins forever.
      const sub = await withTimeout(
        this.swPush.requestSubscription({
          serverPublicKey: this.vapidPublicKey,
        }),
        30_000,
        'Timeout suscribiendo: el service worker no está controlando la página. Recargá (Ctrl+Shift+R) y reintentá.',
      );
      const json = sub.toJSON() as PushSubscriptionJSON;
      this.subscription.set(json);
      this.isSubscribed.set(true);
      return await this.registerOnServer(json);
    } catch (error) {
      CONSOLE.warn('[PushNotificationService] Error al suscribir:', error);
      this.logSwDiagnostics();
      return false;
    } finally {
      this.isBusy.set(false);
    }
  }

  /**
   * Envía una notificación de prueba a través del backend (`POST /push/test`),
   * validando toda la cadena: VAPID → push service → service worker. `message`
   * personaliza el body (opcional). Devuelve un estado corto para feedback de UI.
   */
  async sendTest(message?: string): Promise<'sent' | 'no-subscription' | 'error'> {
    if (!this.isSubscribed()) return 'no-subscription';

    try {
      const res = await firstValueFrom(
        this.http
          .post<ResponseBase<{ sent_to?: number } | null>>(this.testUrl, { message: message ?? '' })
          .pipe(catchError(() => of({ success: false, message: 'error', data: null }))),
      );
      if (!res.success) return 'error';
      return res.data?.sent_to ? 'sent' : 'no-subscription';
    } catch {
      return 'error';
    }
  }

  /**
   * Vuelca el estado del service worker al consola para diagnosticar un
   * subscribe colgado: si el page está controlado y en qué estado está el
   * registro (active / waiting / installing).
   */
  private logSwDiagnostics(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    CONSOLE.log('[PushNotificationService] SW controller:', sw.controller?.state ?? 'null');
    sw.getRegistration()
      .then((reg) => {
        CONSOLE.log('[PushNotificationService] SW registration:', {
          scope: reg?.scope ?? 'none',
          active: reg?.active?.state ?? null,
          waiting: reg?.waiting?.state ?? null,
          installing: reg?.installing?.state ?? null,
        });
      })
      .catch((err) => CONSOLE.warn('[PushNotificationService] getRegistration failed:', err));
  }

  /** Desuscribe el dispositivo y lo elimina del backend. */
  async unsubscribe(): Promise<void> {
    const current = this.subscription();
    if (current?.endpoint) {
      await this.removeFromServer(current.endpoint);
    }

    try {
      await this.swPush.unsubscribe();
    } catch (error) {
      CONSOLE.warn('[PushNotificationService] Error al desuscribir:', error);
    }

    this.subscription.set(null);
    this.isSubscribed.set(false);
  }

  /**
   * Muestra una notificación local (sin pasar por el backend).
   * Útil para feedback inmediato mientras la app está abierta.
   */
  async notify(title: string, options?: NotificationOptions): Promise<void> {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      this.permission() !== 'granted'
    ) {
      return;
    }
    new Notification(title, {
      icon: 'assets/icons/192x192.png',
      ...options,
    });
  }

  private registerOnServer(sub: PushSubscriptionJSON): Promise<boolean> {
    return firstValueFrom(
      this.http
        .post<ResponseBase<unknown>>(this.apiUrl, sub)
        .pipe(catchError(() => of({ success: false, message: 'error', data: null as unknown }))),
    ).then((res) => res.success);
  }

  private removeFromServer(endpoint: string): Promise<void> {
    return firstValueFrom(
      this.http
        .delete<ResponseBase<unknown>>(this.apiUrl, { params: { endpoint } })
        .pipe(catchError(() => of({ success: false, message: 'error', data: null as unknown }))),
    ).then(() => undefined);
  }

  private detectSupport(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  private getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }
}

/** Resuelve `promise` o la rechaza con `message` tras `ms` milisegundos. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
