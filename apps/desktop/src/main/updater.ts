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
export function setupUpdater(getWindow: () => BrowserWindow | null): { checkForUpdates: (interactive?: boolean) => void } {
  if (!app.isPackaged) {
    return {
      checkForUpdates: (interactive) => {
        if (interactive) {
          void dialog.showMessageBox({ message: 'Updates are only checked in the packaged app.' });
        }
      },
    };
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
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

  return { checkForUpdates };
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
