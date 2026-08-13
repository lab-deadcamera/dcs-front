import { environment } from '@environment/environment';

/**
 * Rating display system.
 *
 * The backend stores a single 0-5 integer rating per take. The UI can
 * present it in two ways, selected per environment via `RATING_MODE`:
 *
 *  - 'stars'  classic 5-star strip (identity 1-5).
 *  - 'checks' two check marks, where one check = 3 stars and a double
 *             check = 5 stars. Stored star values are rounded for
 *             display: 4 → 5, 2 → 3, 1 → 0.
 */
export type RatingMode = 'stars' | 'checks';

export const RATING_MODE: RatingMode =
  String(environment.RATING_MODE) === 'checks' ? 'checks' : 'stars';

export const isChecksRating = (): boolean => RATING_MODE === 'checks';

/** Star value each check slot represents, in order (1 check → 3, double → 5). */
export const CHECK_STAR_VALUES = [3, 5] as const;

/** Number of lit checks (0-2) for a stored 0-5 star rating. */
export function ratingToChecks(rating: number): number {
  const r = clampRating(rating);
  if (r >= 4) return 2;
  if (r >= 2) return 1;
  return 0;
}

/** Star-equivalent shown for a stored rating in the current mode.
 *  Checks mode rounds 4→5, 2→3, 1→0; stars mode is the identity. */
export function displayRating(rating: number): number {
  const r = clampRating(rating);
  if (RATING_MODE === 'checks') {
    if (r >= 4) return 5;
    if (r >= 2) return 3;
    return 0;
  }
  return r;
}

/** '✓' × lit checks ('' when none) in checks mode, '★' × value in stars mode. */
export function ratingSymbols(rating: number): string {
  if (RATING_MODE === 'checks') return '✓'.repeat(ratingToChecks(rating));
  return '★'.repeat(clampRating(rating));
}

function clampRating(rating: number): number {
  if (Number.isNaN(rating)) return 0;
  return Math.max(0, Math.min(5, Math.round(rating)));
}
