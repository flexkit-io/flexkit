import { randomBytes } from 'node:crypto';
import { isDesktopLoginStart, withDesktopLoginState } from '@flexkit/studio/electron';

const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

let pending: { state: string; expires: number } | null = null;

/**
 * A login the Studio starts leaves for the system browser with a nonce the
 * backend echoes to the `flexkit://auth/callback`; only that callback is
 * accepted, and only once. Returns the URL to open, with the nonce added
 * when it is a login start.
 */
export function prepareExternalUrl(url: string): string {
  if (!isDesktopLoginStart(url)) {
    return url;
  }

  const state = randomBytes(24).toString('base64url');

  pending = { state, expires: Date.now() + LOGIN_TIMEOUT_MS };

  if (process.env.FLEXKIT_DEBUG_PROTOCOL) {
    console.log('[login] started');
  }

  return withDesktopLoginState(url, state);
}

/** The nonce of the login in flight, or null when none was started or it expired. */
export function expectedLoginState(): string | null {
  return pending && pending.expires > Date.now() ? pending.state : null;
}

/** The callback was accepted: the nonce is spent. */
export function clearLoginState(): void {
  pending = null;
}
