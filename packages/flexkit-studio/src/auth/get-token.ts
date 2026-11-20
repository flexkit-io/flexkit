import { apiPaths } from '../core/api-paths';

/** How long the code exchange may take before the login counts as failed. */
const GET_TOKEN_TIMEOUT_MS = 15 * 1000;

/**
 * Exchange an OAuth authorization code for a session token.
 * This function is framework-agnostic and can be used in any server environment.
 *
 * Never throws: a refused code, an error response, an unreachable backend or
 * an exchange that takes longer than 15 seconds all resolve to an empty `sid`.
 *
 * @param code - The OAuth authorization code received from the auth provider
 * @returns A promise that resolves to an object containing the session ID
 */
export async function getToken(code: string): Promise<{ sid: string }> {
  const url = new URL(apiPaths().sessionId);
  url.searchParams.set('code', code);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // A stalled connection would otherwise hold the login up indefinitely.
      signal: AbortSignal.timeout(GET_TOKEN_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { sid: '' };
    }

    const { sid } = (await response.json()) as { sid?: unknown };

    return { sid: typeof sid === 'string' ? sid : '' };
  } catch {
    return { sid: '' };
  }
}
