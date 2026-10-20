import { join } from 'node:path';
import { app, BrowserWindow, nativeTheme, shell } from 'electron';
import windowStateKeeper from 'electron-window-state';
import { APP_ORIGIN, DOMAIN_ARGUMENT, VERSION_ARGUMENT } from './constants';

const DARK_BACKGROUND = '#020817';
const LIGHT_BACKGROUND = '#ffffff';

function isAppUrl(url: string): boolean {
  return url === APP_ORIGIN || url.startsWith(`${APP_ORIGIN}/`);
}

/** What may leave for the system browser: never `file:`, `smb:` or another OS handler. */
function isBrowserUrl(url: string): boolean {
  return url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:');
}

function isWebUrl(url: string): boolean {
  return url.startsWith('https:') || url.startsWith('http:');
}

// On macOS closing the window hides it: the app stays in the dock and the
// Studio keeps polling Activity and notifying. Quitting closes it for real.
let quitting = false;

app.once('before-quit', () => {
  quitting = true;
});

export interface StudioWindowOptions {
  version: string;
  /** Last word on a URL about to open in the system browser (adds the login nonce). */
  prepareExternalUrl?: (url: string) => string;
}

/**
 * The Studio window. On macOS the title bar is hidden and the Studio's navbar
 * becomes the drag region (the Studio reserves room for the window controls);
 * elsewhere the native frame stays. Links leave for the system browser, and
 * popups (plugin OAuth) open as child windows.
 */
export function createStudioWindow({ version, prepareExternalUrl = (url) => url }: StudioWindowOptions): BrowserWindow {
  const state = windowStateKeeper({ defaultWidth: 1440, defaultHeight: 900 });
  const window = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'Flexkit Studio',
    backgroundColor: nativeTheme.shouldUseDarkColors ? DARK_BACKGROUND : LIGHT_BACKGROUND,
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 16, y: 22 } } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      additionalArguments: [`${VERSION_ARGUMENT}${version}`, `${DOMAIN_ARGUMENT}${__FLEXKIT_DOMAIN__}`],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  state.manage(window);

  window.once('ready-to-show', () => {
    window.show();
  });

  window.on('close', (event) => {
    if (process.platform === 'darwin' && !quitting) {
      event.preventDefault();
      window.hide();
    }
  });

  // The Studio's own pages stay in the window; web links are for the browser;
  // anything else is dropped.
  window.webContents.on('will-navigate', (event, url) => {
    if (process.env.FLEXKIT_DEBUG_PROTOCOL) {
      console.log('[navigate]', url);
    }

    if (isAppUrl(url)) {
      return;
    }

    event.preventDefault();

    if (isBrowserUrl(url)) {
      void shell.openExternal(prepareExternalUrl(url));
    }
  });

  window.webContents.setWindowOpenHandler(({ url, features }) => {
    // The Studio opens plugin OAuth as a blank popup it then drives
    // (`popup.location`, postMessage); the popup's own guard keeps it on the web.
    if (features.includes('popup') && (url === 'about:blank' || url === '' || isWebUrl(url))) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: window,
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
        },
      };
    }

    if (isBrowserUrl(url)) {
      void shell.openExternal(prepareExternalUrl(url));
    }

    return { action: 'deny' };
  });

  // A popup is third-party content: it stays on the web (never the Studio's
  // origin, never an OS handler) and cannot open windows of its own.
  window.webContents.on('did-create-window', (popup) => {
    popup.webContents.on('will-navigate', (event, url) => {
      if (!isWebUrl(url)) {
        event.preventDefault();
      }
    });

    popup.webContents.setWindowOpenHandler(({ url }) => {
      if (isBrowserUrl(url)) {
        void shell.openExternal(url);
      }

      return { action: 'deny' };
    });
  });

  return window;
}

/** Focuses the window, restoring it if it was minimized or hidden. */
export function focusWindow(window: BrowserWindow): void {
  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
}
