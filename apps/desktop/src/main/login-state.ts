import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import { isDesktopLoginStart, withDesktopLoginState } from '@flexkit/studio/electron';

const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

interface PendingLogin {
  state: string;
  expires: number;
}

// Kept on disk too: on Windows and Linux closing the window quits the app,
// and the callback from the browser then relaunches it.
function pendingFile(): string {
  return join(app.getPath('userData'), 'pending-login');
}

function readPending(): PendingLogin | null {
  try {
    const parsed = JSON.parse(readFileSync(pendingFile(), 'utf8')) as Partial<PendingLogin>;

    return typeof parsed.state === 'string' && typeof parsed.expires === 'number' ? { state: parsed.state, expires: parsed.expires } : null;
  } catch {
    return null;
  }
}

function writePending(pending: PendingLogin | null): void {
  const file = pendingFile();

  try {
    if (pending) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify(pending), { mode: 0o600 });
    } else {
      rmSync(file, { force: true });
    }
  } catch (error) {
    console.warn('[flexkit] Could not keep the pending login:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * A login the Studio starts leaves for the system browser with a nonce the
 * backend echoes to the `flexkit://auth/callback`; only that callback is
 * accepted, and only once. Returns the URL to open, with the nonce added
 * when it is a login start on the Flexkit backend.
 */
export function prepareExternalUrl(url: string): string {
  if (!isDesktopLoginStart(url)) {
    return url;
  }

  const state = randomBytes(24).toString('base64url');

  writePending({ state, expires: Date.now() + LOGIN_TIMEOUT_MS });

  if (process.env.FLEXKIT_DEBUG_PROTOCOL) {
    console.log('[login] started');
  }

  return withDesktopLoginState(url, state);
}

/** The nonce of the login in flight, or null when none was started or it expired. */
export function expectedLoginState(): string | null {
  const pending = readPending();

  return pending && pending.expires > Date.now() ? pending.state : null;
}

/** The callback was accepted: the nonce is spent. */
export function clearLoginState(): void {
  writePending(null);
}
