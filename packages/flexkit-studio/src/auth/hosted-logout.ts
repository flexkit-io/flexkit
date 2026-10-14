import { userApiPaths } from '../core/api-paths';

/** Hosted mode sign-out: end the Flexkit session, drop the first-party cookie, go back to the Studio root. */
export async function signOutHosted(rootHref: string): Promise<void> {
  try {
    await fetch(userApiPaths.logout, { credentials: 'same-origin', method: 'POST' });
  } catch {
    // The cookie is cleared below either way; the session expires server-side.
  }

  await fetch('/api/flexkit/logout', { credentials: 'include', method: 'GET' });
  window.location.assign(rootHref);
}
