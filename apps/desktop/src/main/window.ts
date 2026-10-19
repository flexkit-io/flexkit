import { join } from 'node:path';
import { BrowserWindow, nativeTheme, shell } from 'electron';
import windowStateKeeper from 'electron-window-state';
import { APP_ORIGIN, VERSION_ARGUMENT } from './constants';

const DARK_BACKGROUND = '#020817';
const LIGHT_BACKGROUND = '#ffffff';

function isAppUrl(url: string): boolean {
  return url === APP_ORIGIN || url.startsWith(`${APP_ORIGIN}/`);
}

export interface StudioWindowOptions {
  version: string;
}

/**
 * The Studio window. On macOS the title bar is hidden and the Studio's navbar
 * becomes the drag region (the Studio reserves room for the window controls);
 * elsewhere the native frame stays. Links leave for the system browser, and
 * popups (plugin OAuth) open as child windows.
 */
export function createStudioWindow({ version }: StudioWindowOptions): BrowserWindow {
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
      additionalArguments: [`${VERSION_ARGUMENT}${version}`],
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

  // The Studio's own pages stay in the window; anything else is for the browser.
  window.webContents.on('will-navigate', (event, url) => {
    if (process.env.FLEXKIT_DEBUG_PROTOCOL) {
      console.log('[navigate]', url);
    }

    if (!isAppUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  window.webContents.setWindowOpenHandler(({ url, features }) => {
    // The Studio opens plugin OAuth as a popup it then drives (`popup.location`, postMessage).
    if (features.includes('popup')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: window,
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
        },
      };
    }

    if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:')) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
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
