/** Prefix of Flexkit API tokens (project and team tokens). */
export const API_TOKEN_PREFIX = 'flk-';

export type BffSession = { token: string; error?: undefined } | { token?: undefined; error: string };

function getBearerToken(authorizationHeader: string | null): string {
  if (!authorizationHeader) {
    return '';
  }

  const [scheme, token, ...rest] = authorizationHeader.trim().split(/\s+/);

  if (rest.length > 0 || !scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return '';
  }

  return token;
}

/**
 * The credential the BFF forwards to Flexkit: the first-party session cookie,
 * or a user session passed as a bearer token where cookies are unavailable
 * (sandboxed previews). API tokens are refused: the BFF runs on the Studio's
 * behalf with a user's session and must not become an unauthenticated relay
 * for server credentials.
 */
export function resolveBffSession(sessionCookie: string, authorizationHeader: string | null): BffSession {
  const bearerToken = getBearerToken(authorizationHeader);

  if (bearerToken.startsWith(API_TOKEN_PREFIX)) {
    return { error: 'API tokens are not accepted here. Call the project API directly with the token.' };
  }

  return { token: sessionCookie || bearerToken };
}
