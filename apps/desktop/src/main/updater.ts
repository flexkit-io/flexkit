import { app, dialog } from 'electron';
import type { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC } from './constants';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Updates come from the GitHub release the app was published with. They
 * download in the background; the Studio shows "Restart to update" in its
 * app bar, and the update also installs on the next quit.
 */
export interface Updater {
  checkForUpdates: (interactive?: boolean) => void;
  /** The version downloaded and waiting for a restart, if any: the Studio asks when it mounts. */
  getDownloadedVersion: () => string | null;
}

export function setupUpdater(getWindow: () => BrowserWindow | null): Updater {
  if (!app.isPackaged) {
    return {
      checkForUpdates: (interactive) => {
        if (interactive) {
          void dialog.showMessageBox({ message: 'Updates are only checked in the packaged app.' });
        }
      },
      getDownloadedVersion: () => null,
    };
  }

  let downloadedVersion: string | null = null;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    downloadedVersion = info.version;
    getWindow()?.webContents.send(IPC.updateDownloaded, { version: info.version });
  });

  autoUpdater.on('error', (error) => {
    console.warn('[flexkit] Update check failed:', error.message);
  });

  let interactive = false;

  autoUpdater.on('update-not-available', () => {
    if (interactive) {
      interactive = false;
      void dialog.showMessageBox({ message: `Flexkit Studio ${app.getVersion()} is up to date.` });
    }
  });

  function checkForUpdates(fromMenu = false): void {
    interactive = fromMenu;
    autoUpdater.checkForUpdates().catch(() => undefined);
  }

  checkForUpdates();
  setInterval(() => checkForUpdates(), CHECK_INTERVAL_MS).unref();

  return { checkForUpdates, getDownloadedVersion: () => downloadedVersion };
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
