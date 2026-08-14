export const environment = {
  production: false,
  API_URL: 'http://localhost:9099/api/v1',
  API_BASE_URL: 'http://localhost:9099',
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
   * VAPID public key — debe coincidir con la private key del backend.
   * Web Push funciona en localhost (secure context) sin HTTPS.
   */
  PUSH_VAPID_PUBLIC_KEY:
    'p9UUmqrWY4B4mta4PgJVXJmKrka1ZI89g6iRzQsFZV_v-dvOYdwFYT0ZMedbKloEvi9W00YJPHmUGRVgl8i4Bw',
};
