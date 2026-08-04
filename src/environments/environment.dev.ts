export const environment = {
  production: false,
  API_URL: 'https://back-dev.road2theoscars.tech/api/v1',
  API_BASE_URL: 'https://back-dev.road2theoscars.tech',
  TRANSLATOR_URL: 'https://translator.road2theoscars.tech',
  /**
   * Sistema de rating de takes:
   *  - 'stars'  → 5 estrellas (1-5).
   *  - 'checks' → 1 check = 3 estrellas, doble check = 5.
   *                Al mostrar, 4→5, 2→3, 1→0.
   */
  RATING_MODE: 'checks',
};

// export const environment = {
//   production: false,
//   API_URL: 'http://localhost:9099/api/v1',
//   API_BASE_URL: 'http://localhost:9099',
// };
