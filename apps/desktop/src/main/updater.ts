import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, dialog } from 'electron';
import type { BrowserWindow, MessageBoxOptions } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC } from './constants';
import { focusWindow } from './window';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Updates come from the GitHub release the app was published with. They
 * download in the background. A downloaded update is offered in a dialog
 * (install now, on quit, or skip that version), the Studio's app bar shows
 * "Restart to update" as well, and unless skipped it installs on the next quit.
 * "Check for Updates…" in the menu reports every outcome in a dialog.
 */
export interface Updater {
  /** `interactive`: the person asked (menu), so every outcome gets a dialog. */
  checkForUpdates: (interactive?: boolean) => Promise<void>;
  /** The version downloaded and waiting for a restart, if any: the Studio asks when it mounts. */
  getDownloadedVersion: () => string | null;
}

export function setupUpdater(getWindow: () => BrowserWindow | null): Updater {
  const showDialog = (options: MessageBoxOptions): Promise<number> => {
    const window = getWindow();

    if (window && window.isVisible()) {
      focusWindow(window);

      return dialog.showMessageBox(window, options).then(({ response }) => response);
    }

    return dialog.showMessageBox(options).then(({ response }) => response);
  };

  if (!app.isPackaged) {
    return {
      checkForUpdates: async (interactive) => {
        if (interactive) {
          await showDialog({ type: 'info', message: 'Updates are only checked in the packaged app.' });
        }
      },
      getDownloadedVersion: () => null,
    };
  }

  // "Skip This Version" survives restarts; a later version is offered again.
  const skipFile = join(app.getPath('userData'), 'skipped-update');
  let skippedVersion: string | null = null;

  try {
    skippedVersion = readFileSync(skipFile, 'utf8').trim() || null;
  } catch {
    // Nothing skipped.
  }

  let downloadedVersion: string | null = null;
  // The automatic prompt shows once per version per run; a skipped version
  // is not prompted for unless the person checks for updates themselves.
  let promptedVersion: string | null = null;
  let promptRequested = false;
  let checking: Promise<void> | null = null;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const promptToInstall = async (version: string): Promise<void> => {
    promptedVersion = version;

    const response = await showDialog({
      type: 'info',
      title: 'Update ready',
      message: 'A new version of Flexkit Studio is ready to install.',
      detail: `Flexkit Studio ${version} has been downloaded. Install it and relaunch now? Otherwise it installs when you quit.`,
      buttons: ['Install and Relaunch', 'Install on Quit', 'Skip This Version'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      installUpdate();

      return;
    }

    if (response === 2) {
      skippedVersion = version;
      autoUpdater.autoInstallOnAppQuit = false;
      writeFileSync(skipFile, version, { mode: 0o600 });

      return;
    }

    // Install on Quit.
    skippedVersion = null;
    autoUpdater.autoInstallOnAppQuit = true;
    rmSync(skipFile, { force: true });
  };

  autoUpdater.on('update-downloaded', (info) => {
    downloadedVersion = info.version;
    getWindow()?.webContents.send(IPC.updateDownloaded, { version: info.version });

    if (info.version !== skippedVersion) {
      autoUpdater.autoInstallOnAppQuit = true;
    }

    const requested = promptRequested;

    promptRequested = false;

    if (promptedVersion === info.version || (!requested && info.version === skippedVersion)) {
      return;
    }

    void promptToInstall(info.version);
  });

  autoUpdater.on('error', (error) => {
    console.warn('[flexkit] Update check failed:', error.message);
  });

  const check = async (interactive: boolean): Promise<void> => {
    if (interactive && downloadedVersion !== null) {
      await promptToInstall(downloadedVersion);

      return;
    }

    let result: Awaited<ReturnType<typeof autoUpdater.checkForUpdates>>;

    try {
      result = await autoUpdater.checkForUpdates();
    } catch (error) {
      if (interactive) {
        await showDialog({
          type: 'error',
          title: 'Update check failed',
          message: 'Flexkit Studio could not check for updates.',
          detail: error instanceof Error ? error.message : String(error),
        });
      }

      return;
    }

    if (!interactive) {
      return;
    }

    if (!result?.isUpdateAvailable) {
      await showDialog({
        type: 'info',
        title: 'Up to date',
        message: "You're up to date.",
        detail: `Flexkit Studio ${app.getVersion()} is the latest version.`,
      });

      return;
    }

    // The download is under way (`autoDownload`); `update-downloaded` then
    // prompts, even for a version that was skipped before.
    promptRequested = true;
    await showDialog({
      type: 'info',
      title: 'Update available',
      message: 'A new version of Flexkit Studio is available.',
      detail: `Flexkit Studio ${result.updateInfo.version} is downloading in the background. You'll be asked to install it as soon as it's ready.`,
    });
  };

  function checkForUpdates(interactive = false): Promise<void> {
    if (checking === null) {
      checking = check(interactive).finally(() => {
        checking = null;
      });
    }

    return checking;
  }

  void checkForUpdates();
  setInterval(() => void checkForUpdates(), CHECK_INTERVAL_MS).unref();

  return { checkForUpdates, getDownloadedVersion: () => downloadedVersion };
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
