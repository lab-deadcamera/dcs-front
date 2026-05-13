/**
 * Production environment.
 *
 * `API_URL` is the base for every HTTP call made from feature services.
 * For local development the `dev` configuration in `angular.json` swaps
 * this file with `environment.development.ts` via fileReplacements.
 */
export const environment = {
  production: true,
  API_URL: 'https://back.road2theoscars.tech/api/v1',
};
