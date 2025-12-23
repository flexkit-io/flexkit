import { apiPaths } from '../core/api-paths';

/**
 * Exchange an OAuth authorization code for a session token.
 * This function is framework-agnostic and can be used in any server environment.
 *
 * @param code - The OAuth authorization code received from the auth provider
 * @returns A promise that resolves to an object containing the session ID
 */
export async function getToken(code: string): Promise<{ sid: string }> {
  const url = new URL(apiPaths().sessionId);
  url.searchParams.set('code', code);

  const token: { sid: string } = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((res) => res.json() as Promise<{ sid: string }>)
    .catch((_error: unknown) => {
      return { sid: '' };
    });

  return token;
}
