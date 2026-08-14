# Notificaciones Push (Web Push)

Guía para activar notificaciones push en **DCS Videos** con el service worker de Angular y `PushNotificationService`.

---

## 1. Requisitos

| Requisito | Estado |
| --- | --- |
| HTTPS (o `localhost` en desarrollo) | Obligatorio |
| Service worker de Angular (`ngsw-worker.js`) | Ya activo |
| Par de claves **VAPID** (pública/privada) | Falta generar |
| Backend capaz de enviar push (`web-push`/FCM) | Falta implementar |

El servicio en el frontend ya está listo: `src/app/services/push-notification.service.ts`.

---

## 2. Generar las claves VAPID

```bash
npx web-push generate-vapid-keys
```

Resultado:

```
Public Key:
  BAxxxx...

Private Key:
  xxxx...
```

- **Public key** → frontend (`PUSH_VAPID_PUBLIC_KEY`).
- **Private key** → backend (nunca la subas al frontend).

---

## 3. Configurar el frontend

Pega la VAPID **pública** en `src/environments/environment.ts` (producción):

```ts
export const environment = {
  // ...
  PUSH_ENABLED: true,
  PUSH_VAPID_PUBLIC_KEY: 'BAxxxx...',
};
```

> `PUSH_ENABLED: false` y clave vacía en `environment.development.ts` / `environment.dev.ts` desactivan push en desarrollo. El service worker solo se registra en builds de producción, así que en `ng serve` no verás push.

---

## 4. Contrato de API (backend)

El frontend espera estos endpoints bajo `{API_URL}/push/subscriptions`:

### `POST /push/subscriptions`
Registra la suscripción del usuario autenticado.

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/xxx",
  "expirationTime": null,
  "keys": { "p256dh": "BLaX...", "auth": "VGy..." }
}
```

Respuesta (shape estándar del proyecto):

```json
{ "success": true, "message": "ok", "data": null }
```

### `DELETE /push/subscriptions?endpoint=...`
Elimina una suscripción (al desuscribirse el usuario).

Respuesta:

```json
{ "success": true, "message": "ok", "data": null }
```

---

## 5. Backend (ejemplo Node con `web-push`)

```bash
npm i web-push
```

```js
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:tu@correo.com', // contact
  process.env.VAPID_PUBLIC_KEY,  // misma public key que el frontend
  process.env.VAPID_PRIVATE_KEY, // private key (secreta)
);

// Enviar a todas las suscripciones de un usuario:
const subs = await db.getSubscriptions(userId);
for (const sub of subs) {
  try {
    await webpush.sendNotification(sub, JSON.stringify({
      notification: {
        title: 'Tu video está listo 🎬',
        body: 'El render de "Escena 4" terminó.',
        icon: 'assets/icons/192x192.png',
        data: {
          onActionClick: {
            default: { operation: 'openWindow', url: '/studio' }
          }
        }
      }
    }));
  } catch (e) {
    // Código 404/410 = suscripción inválida → bórrala.
    if (e.statusCode === 404 || e.statusCode === 410) {
      await db.deleteSubscription(sub.endpoint);
    }
  }
}
```

> `webpush.sendNotification(sub, payload)` acepta directamente el objeto de suscripción que guardaste (endpoint + keys).

---

## 6. Uso en el frontend

### Activar notificaciones (botón)

```ts
import { Component, inject } from '@angular/core';
import { PushNotificationService } from '@services/push-notification.service';

@Component({ ... })
export class NotificationsButtonComponent {
  private push = inject(PushNotificationService);

  readonly isSubscribed = this.push.isSubscribed;
  readonly isBusy = this.push.isBusy;

  async toggle(): Promise<void> {
    if (this.push.isSubscribed()) {
      await this.push.unsubscribe();
    } else {
      const ok = await this.push.subscribe();
      // ok === true → suscrito y registrado en el backend
    }
  }
}
```

### Reaccionar a mensajes con la app abierta

El SW muestra la notificación automáticamente. Si quieres además mostrar un toast o actualizar la UI:

```ts
this.push.init({
  onMessage: (msg) => console.log('Nuevo push:', msg),
  onNotificationClick: ({ notification }) => {
    console.log('Click en:', notification.title);
    // navega con this.router.navigateByUrl(...) si hace falta
  },
});
```

### Notificación local (sin backend)

```ts
await this.push.notify('Render finalizado', { body: 'Escena 4 lista' });
```

### Estado disponible (signals)

| Signal | Tipo | Significado |
| --- | --- | --- |
| `isSupported()` | `boolean` | El navegador soporta push |
| `permission()` | `NotificationPermission` | Estado del permiso |
| `isSubscribed()` | `boolean` | Dispositivo suscrito |
| `isBusy()` | `boolean` | Operación de suscripción en curso |
| `subscription()` | `PushSubscriptionJSON \| null` | Suscripción actual |

---

## 7. Pruebas sin backend

1. Build: `npm run build:prod`
2. Sirve el dist: `npx http-server dist/dcs-videos/browser -p 8080 -c-1`
3. Abre en **incógnito** `http://localhost:8080`
4. Chrome DevTools → **Application** → **Service Workers** → campo **Push**, y envía:

```json
{
  "notification": {
    "title": "Prueba",
    "body": "Notificación de prueba",
    "icon": "assets/icons/192x192.png"
  }
}
```

---

## 8. Troubleshooting

| Síntoma | Causa/Solución |
| --- | --- |
| `canEnable()` false | Falta VAPID key, `PUSH_ENABLED: false`, o el SW no está activo (usa build prod, no `ng serve`). |
| `Permission denied` | El usuario bloqueó notificaciones; debe reactivarlas desde el candado de la barra de direcciones. |
| No llegan notificaciones con la app cerrada | El backend debe enviar con la **private key** correcta y la **public key** debe coincidir con la del frontend. |
| Error 404/410 al enviar | Suscripción inválida → bórrala en el backend. |
| iOS/Safari no muestra | Requiere iOS ≥ 16.4 y que la app esté **instalada** en el home screen. |
