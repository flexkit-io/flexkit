/**
 * The message to show for a failed API response. Automation routes answer
 * refusals with `{ success: false, errorCode, errorMessage }`, where the
 * message may be a list; other routes and older backends send `{ error }`.
 * Anything else falls back to `fallback`, so a body without a usable message
 * (or no JSON body at all) still reads as before.
 */
export function getResponseErrorMessage(data: unknown, fallback = 'Request failed'): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return fallback;
  }

  const { error, errorMessage } = data as { error?: unknown; errorMessage?: unknown };

  if (typeof errorMessage === 'string' && errorMessage.trim()) {
    return errorMessage;
  }

  if (Array.isArray(errorMessage)) {
    const parts = errorMessage.filter((part): part is string => typeof part === 'string' && part.trim() !== '');

    if (parts.length > 0) {
      // The parts are full sentences.
      return parts.join(' ');
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}
