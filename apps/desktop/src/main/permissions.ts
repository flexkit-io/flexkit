import { session, systemPreferences } from 'electron';
import { APP_ORIGIN } from './constants';

const ALWAYS_ALLOWED = new Set(['notifications', 'clipboard-read', 'clipboard-sanitized-write']);

function isAppPage(url: string | undefined): boolean {
  return url !== undefined && (url === APP_ORIGIN || url.startsWith(`${APP_ORIGIN}/`));
}

/** The microphone, for dictation: audio only, and only for the Studio itself. */
function isMicrophoneRequest(permission: string, details: { mediaTypes?: readonly string[]; requestingUrl?: string }): boolean {
  const types = details.mediaTypes ?? [];

  return permission === 'media' && types.length > 0 && types.every((type) => type === 'audio');
}

/**
 * Chromium's default grants everything a page asks for. The Studio's own
 * pages get notifications, the clipboard and the microphone (dictation); on
 * macOS the microphone also needs the system's consent, asked once and
 * remembered. Other content in the session (a plugin's OAuth popup) gets
 * nothing without a prompt, as in a browser.
 */
export function setupPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    if (!isAppPage(details.requestingUrl)) {
      callback(false);

      return;
    }

    if (ALWAYS_ALLOWED.has(permission)) {
      callback(true);

      return;
    }

    if (isMicrophoneRequest(permission, details)) {
      if (process.platform === 'darwin') {
        void systemPreferences.askForMediaAccess('microphone').then(callback, () => {
          callback(false);
        });
      } else {
        callback(true);
      }

      return;
    }

    callback(false);
  });

  // `navigator.permissions.query` and device enumeration go through here.
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) => {
    if (!isAppPage(requestingOrigin)) {
      return false;
    }

    if (ALWAYS_ALLOWED.has(permission)) {
      return true;
    }

    if (permission === 'media') {
      const mediaType = 'mediaType' in details ? details.mediaType : undefined;

      return mediaType === undefined || mediaType === 'audio';
    }

    return false;
  });
}
