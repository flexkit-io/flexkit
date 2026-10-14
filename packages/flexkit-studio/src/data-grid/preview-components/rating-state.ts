export const DEFAULT_RATING_MAX = 5;

export type RatingState = {
  /** Number of filled stars. */
  filled: number;
  /** Total number of stars. */
  max: number;
  /** Accessible description, e.g. "4 out of 5 stars". */
  label: string;
};

/**
 * Turns a stored value into what the stars show. Non-numeric, missing and
 * empty values yield `null` (render nothing); numbers are rounded and clamped
 * to `[0, max]`. `max` comes from `options.max` and falls back to five.
 */
export function getRatingState(value: unknown, max: number | undefined = DEFAULT_RATING_MAX): RatingState | null {
  const total = Number.isFinite(max) && (max as number) >= 1 ? Math.floor(max as number) : DEFAULT_RATING_MAX;
  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
    return null;
  }

  const filled = Math.min(total, Math.max(0, Math.round(numeric)));

  return { filled, max: total, label: `${String(filled)} out of ${String(total)} stars` };
}
