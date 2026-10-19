/**
 * The bridge the Flexkit Studio desktop app (Electron) exposes to the Studio
 * through its preload script, as `window.flexkitDesktop`. Studio features
 * check for the bridge (a capability), never for a platform, so the web
 * Studio never sees any of this.
 */
export interface FlexkitDesktopBridge {
  platform: 'darwin' | 'win32' | 'linux';
  /** Installed app version; it tracks the `@flexkit/studio` version it bundles. */
  version: string;
  /** The URL the OAuth login hands the session code to; the app registered its scheme with the OS. */
  loginCallback: string;
  /** Dock (macOS) or taskbar badge; 0 clears it. */
  setBadgeCount: (count: number) => void;
  /** Brings the Studio window to the front (a clicked notification, for example). */
  focusWindow: () => void;
  /** Paths the app asks the Studio to open: deep links and menu items. Returns the unsubscribe function. */
  onNavigate: (listener: (path: string) => void) => () => void;
  /** An update has been downloaded and installs on the next restart. Returns the unsubscribe function. */
  onUpdateDownloaded: (listener: (update: { version: string }) => void) => () => void;
  /** Restarts into the downloaded update. */
  installUpdate: () => void;
}

/** The desktop app's login callback (see `DESKTOP_LOGIN_CALLBACK` in the Electron adapter). */
export const DESKTOP_LOGIN_CALLBACK = 'flexkit://auth/callback';

type WindowWithDesktop = { flexkitDesktop?: FlexkitDesktopBridge };

/** The desktop bridge when the Studio runs inside the desktop app, otherwise undefined. */
export function getDesktop(): FlexkitDesktopBridge | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (window as unknown as WindowWithDesktop).flexkitDesktop;
}
