import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { app, safeStorage } from 'electron';
import type { DesktopSessionStore } from '@flexkit/studio/electron';

const ENCRYPTED_PREFIX = 'enc:';
const PLAIN_PREFIX = 'raw:';

/** The OS refused to encrypt the session (on macOS: keychain access denied). */
export class SessionStoreError extends Error {
  constructor(cause: unknown) {
    super('The session could not be stored securely.', { cause });
    this.name = 'SessionStoreError';
  }
}

/**
 * The Flexkit session, encrypted with the OS keychain (macOS), DPAPI
 * (Windows) or the desktop's secret service (Linux) through `safeStorage`,
 * in the app's user-data folder. Falls back to a plain file where no
 * encryption backend exists (some Linux setups), with a warning in the log.
 */
export function createSessionStore(): DesktopSessionStore & { file: string } {
  const file = join(app.getPath('userData'), 'session');
  let cached: string | null = null;

  return {
    file,
    async get() {
      if (cached !== null) {
        return cached;
      }

      try {
        const stored = await readFile(file, 'utf8');

        if (stored.startsWith(ENCRYPTED_PREFIX)) {
          cached = safeStorage.decryptString(Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), 'base64'));
        } else if (stored.startsWith(PLAIN_PREFIX)) {
          cached = stored.slice(PLAIN_PREFIX.length);
        } else {
          cached = '';
        }
      } catch {
        cached = '';
      }

      return cached;
    },
    async set(token) {
      cached = token;
      await mkdir(dirname(file), { recursive: true });

      if (safeStorage.isEncryptionAvailable()) {
        let encrypted: Buffer;

        try {
          encrypted = safeStorage.encryptString(token);
        } catch (error) {
          // macOS asks before the app may use its keychain entry; a refusal
          // lands here. The session is not written unencrypted instead.
          throw new SessionStoreError(error);
        }

        await writeFile(file, `${ENCRYPTED_PREFIX}${encrypted.toString('base64')}`, { mode: 0o600 });
      } else {
        console.warn('[flexkit] No encryption backend available; the session is stored unencrypted.');
        await writeFile(file, `${PLAIN_PREFIX}${token}`, { mode: 0o600 });
      }
    },
    async clear() {
      cached = '';
      await rm(file, { force: true });
    },
  };
}
