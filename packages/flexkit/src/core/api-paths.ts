const projectId = process.env.NEXT_PUBLIC_FLEXKIT_PROJECT_ID;
const domain = 'api.flexkit.io';
const baseUrl = `https://${projectId}.${domain}`;

/**
 * There are two types of API paths:
 * - Authenticated: go through a local API route where the token, obtained from the auth cookie, is added as a bearer token header
 * - Unauthenticated: go directly to the Flexkit API (the ones with the baseUrl)
 *
 * TODO: differentiate both kinds of paths, to easily identify whether a path is authenticated or not
 */
export const apiPaths = {
  authProviders: `${baseUrl}/auth/providers`,
  sessionId: `${baseUrl}/auth/session`,
  currentUser: '/api/flexkit/users/me',
  schema: `${baseUrl}/schema`,
  logout: `/api/flexkit/auth/logout`,
};
