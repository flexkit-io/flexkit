/** The scheme the app registers with the OS and serves the Studio on. */
export const APP_SCHEME = 'flexkit';
/** The Studio's own origin inside the app: `flexkit://app/...`. */
export const APP_HOST = 'app';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
/** Where the OAuth login hands the session code to (see the Flexkit backend's allowlist). */
export const LOGIN_CALLBACK_HOST = 'auth';

/** IPC channels between the preload bridge and the main process. */
export const IPC = {
  setBadge: 'desktop:set-badge',
  focusWindow: 'desktop:focus-window',
  installUpdate: 'desktop:install-update',
  navigate: 'desktop:navigate',
  updateDownloaded: 'desktop:update-downloaded',
  getUpdate: 'desktop:get-update',
} as const;

/** Argument the preload reads the app version from (`--flexkit-version=1.2.3`). */
export const VERSION_ARGUMENT = '--flexkit-version=';
