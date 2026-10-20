import './env';
import { join } from 'node:path';
import { app, BrowserWindow, ipcMain, Menu, nativeTheme } from 'electron';
import contextMenu from 'electron-context-menu';
import { completeDesktopLogin, createFlexkitElectronHandler } from '@flexkit/studio/electron';
import { APP_ORIGIN, APP_SCHEME, IPC, LOGIN_CALLBACK_HOST } from './constants';
import { getLaunchUrl, setupDeepLinks } from './deep-link';
import { clearLoginState, expectedLoginState, prepareExternalUrl } from './login-state';
import { buildApplicationMenu } from './menu';
import { setupPermissions } from './permissions';
import { registerAppProtocol, registerAppScheme, restrictApiToStudio } from './protocol';
import { createSessionStore } from './session-store';
import { installUpdate, setupUpdater } from './updater';
import { createStudioWindow, focusWindow } from './window';

registerAppScheme();

// Builds against the local backend (`FLEXKIT_DOMAIN=flexkit.test`): its
// certificate is self-signed, and their session must not mix with production's.
app.setName('Flexkit Studio');

if (__FLEXKIT_DOMAIN__ === 'flexkit.test') {
  app.commandLine.appendSwitch('ignore-certificate-errors');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  app.setPath('userData', join(app.getPath('appData'), 'Flexkit Studio (flexkit.test)'));
} else if (app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), 'Flexkit Studio'));
} else {
  app.setPath('userData', join(app.getPath('appData'), 'Flexkit Studio (dev)'));
}

const sessionStore = createSessionStore();
const handleApi = createFlexkitElectronHandler({ sessionStore });

let mainWindow: BrowserWindow | null = null;
let pendingUrl = getLaunchUrl();
// URLs from the OS wait until the scheme is served and the window exists.
let ready = false;

function getWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

function showStudio(path = '/'): void {
  const window = getWindow() ?? createWindow();

  void window.loadURL(`${APP_ORIGIN}${path}`);
  focusWindow(window);
}

/** The window holds the Studio, loaded or still loading (a fresh window has nothing). */
function hasStudio(window: BrowserWindow): boolean {
  return window.webContents.getURL().startsWith(APP_ORIGIN);
}

/** The Studio is on screen and can take a path over IPC. */
function isStudioLoaded(window: BrowserWindow): boolean {
  return hasStudio(window) && !window.webContents.isLoading();
}

/** A `flexkit://` URL from the OS: the login callback, or a path into the Studio. */
async function handleAppUrl(url: string): Promise<void> {
  let parsed: URL;

  if (process.env.FLEXKIT_DEBUG_PROTOCOL) {
    // The login code is a secret: never log the whole callback URL.
    console.log('[deep-link]', url.split('?')[0]);
  }

  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  if (parsed.protocol !== `${APP_SCHEME}:`) {
    return;
  }

  if (parsed.host === LOGIN_CALLBACK_HOST) {
    const expectedState = expectedLoginState();
    const redirect = await completeDesktopLogin(url, sessionStore, { expectedState });

    if (redirect !== null) {
      clearLoginState();
    }

    if (process.env.FLEXKIT_DEBUG_PROTOCOL) {
      console.log('[deep-link] login', redirect === null ? `refused (${expectedState === null ? 'no login in flight' : 'state or code'})` : `ok -> ${redirect}`);
    }

    // A refused code leaves the Studio where it is (the login page, or the
    // path a first, accepted callback is still loading).
    const window = getWindow();

    if (redirect !== null) {
      showStudio(redirect);
    } else if (window && hasStudio(window)) {
      focusWindow(window);
    } else {
      showStudio('/');
    }

    return;
  }

  if (url === APP_ORIGIN || url.startsWith(`${APP_ORIGIN}/`)) {
    const window = getWindow();
    const path = `${parsed.pathname}${parsed.search}`;

    if (window && isStudioLoaded(window)) {
      window.webContents.send(IPC.navigate, path);
      focusWindow(window);
    } else {
      showStudio(path);
    }
  }
}

function handleOsUrl(url: string): void {
  if (ready) {
    void handleAppUrl(url);
  } else {
    pendingUrl = url;
  }
}

function createWindow(): BrowserWindow {
  const window = createStudioWindow({ version: app.getVersion(), prepareExternalUrl });

  mainWindow = window;

  window.on('closed', () => {
    mainWindow = null;
  });

  return window;
}

if (setupDeepLinks(handleOsUrl, () => {
  const window = getWindow();

  if (window) {
    focusWindow(window);
  }
})) {
  void app.whenReady().then(async () => {
    app.setAppUserModelId('app.flexkit.studio');

    if (process.env.FLEXKIT_DEBUG_PROTOCOL) {
      console.log('[session] store', sessionStore.file, 'token length', (await sessionStore.get()).length);
    }

    registerAppProtocol({
      handleApi,
      rendererDir: join(__dirname, '../renderer'),
      devServerUrl: app.isPackaged ? undefined : process.env.ELECTRON_RENDERER_URL,
    });

    setupPermissions();
    restrictApiToStudio((webContentsId) => webContentsId !== undefined && webContentsId === getWindow()?.webContents.id);

    contextMenu({ showSearchWithGoogle: false, showLookUpSelection: process.platform === 'darwin' });

    const updater = setupUpdater(getWindow);

    Menu.setApplicationMenu(buildApplicationMenu({ getWindow, checkForUpdates: () => updater.checkForUpdates(true) }));

    // Only the Studio window may talk to the main process.
    const fromStudio = (event: { sender: { id: number } }): boolean => event.sender.id === getWindow()?.webContents.id;

    ipcMain.on(IPC.setBadge, (event, count: unknown) => {
      if (fromStudio(event)) {
        app.setBadgeCount(typeof count === 'number' && Number.isFinite(count) && count > 0 ? Math.floor(count) : 0);
      }
    });

    ipcMain.on(IPC.focusWindow, (event) => {
      const window = getWindow();

      if (window && fromStudio(event)) {
        focusWindow(window);
      }
    });

    ipcMain.on(IPC.installUpdate, (event) => {
      if (fromStudio(event)) {
        installUpdate();
      }
    });

    ipcMain.handle(IPC.getUpdate, (event) => (fromStudio(event) ? updater.getDownloadedVersion() : null));

    nativeTheme.on('updated', () => {
      getWindow()?.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#020817' : '#ffffff');
    });

    createWindow();
    ready = true;

    if (pendingUrl) {
      const url = pendingUrl;

      pendingUrl = undefined;
      await handleAppUrl(url);
    } else {
      showStudio('/');
    }

    app.on('activate', () => {
      // macOS: the dock icon reopens the window after it was closed.
      if (BrowserWindow.getAllWindows().length === 0) {
        showStudio('/');
      } else {
        const window = getWindow();

        if (window) {
          focusWindow(window);
        }
      }
    });
  });

  app.on('window-all-closed', () => {
    // macOS apps stay open without windows; notifications keep arriving.
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
