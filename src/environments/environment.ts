export const environment = {
  production: true,
  API_URL: 'https://back.road2theoscars.tech/api/v1',
  API_BASE_URL: 'https://back.road2theoscars.tech',
  TRANSLATOR_URL: 'https://translator.road2theoscars.tech',
  /**
   * Sistema de rating de takes:
   *  - 'stars'  → 5 estrellas (1-5).
   *  - 'checks' → 1 check = 3 estrellas, doble check = 5.
   *                Al mostrar, 4→5, 2→3, 1→0.
   */
  RATING_MODE: 'checks',
  PUSH_ENABLED: true,
  /**
   * VAPID public key generada con: npx web-push generate-vapid-keys
   * Debe coincidir con la private key que usa el backend para enviar.
   * Vacía = push deshabilitado.
   */
  PUSH_VAPID_PUBLIC_KEY:
    'vntt_HR8izumEH9cFqg-lT7cXO82_iHyeTjmCFeznGgVoJxdkDgkp0_ygat4rNI9c8oWd8YXkcsOCMT-g4t3vg',
};
