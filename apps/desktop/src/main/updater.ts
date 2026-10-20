import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, dialog } from 'electron';
import type { BrowserWindow, MessageBoxOptions, MessageBoxReturnValue } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC } from './constants';
import { showUpdateDialog } from './update-dialog';
import { focusWindow } from './window';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Updates come from the GitHub release the app was published with. By
 * default they download in the background and a dialog then offers to
 * install (now, on quit, or skip that version); with automatic downloads
 * turned off the dialog asks before downloading. The Studio's app bar shows
 * "Restart to update" as well, and unless skipped a downloaded update
 * installs on the next quit. "Check for Updates…" reports every outcome.
 */
export interface Updater {
  /** `interactive`: the person asked (menu), so every outcome gets a dialog. */
  checkForUpdates: (interactive?: boolean) => Promise<void>;
  /** The version downloaded and waiting for a restart, if any: the Studio asks when it mounts. */
  getDownloadedVersion: () => string | null;
}

/** Persisted in the user-data folder. */
interface UpdateSettings {
  autoDownload: boolean;
  /** "Skip This Version": not offered again, and not installed on quit. */
  skippedVersion: string | null;
}

function readSettings(file: string): UpdateSettings {
  const settings: UpdateSettings = { autoDownload: true, skippedVersion: null };

  try {
    const stored = JSON.parse(readFileSync(file, 'utf8')) as Partial<UpdateSettings>;

    if (typeof stored.autoDownload === 'boolean') {
      settings.autoDownload = stored.autoDownload;
    }

    if (typeof stored.skippedVersion === 'string') {
      settings.skippedVersion = stored.skippedVersion;
    }
  } catch {
    // Defaults.
  }

  return settings;
}

export function setupUpdater(getWindow: () => BrowserWindow | null): Updater {
  /** A sheet on the Studio window when it is on screen, a standalone alert otherwise. */
  const showSheet = (options: MessageBoxOptions): Promise<MessageBoxReturnValue> => {
    const window = getWindow();

    if (window && window.isVisible()) {
      focusWindow(window);

      return dialog.showMessageBox(window, options);
    }

    return dialog.showMessageBox(options);
  };

  if (!app.isPackaged) {
    return {
      checkForUpdates: async (interactive) => {
        if (interactive) {
          await showSheet({ type: 'info', message: 'Updates are only checked in the packaged app.' });
        }
      },
      getDownloadedVersion: () => null,
    };
  }

  const settingsFile = join(app.getPath('userData'), 'update-settings.json');
  const settings = readSettings(settingsFile);
  const saveSettings = (): void => {
    writeFileSync(settingsFile, JSON.stringify(settings), { mode: 0o600 });
  };

  let downloadedVersion: string | null = null;
  // Each prompt shows once per version per run; a skipped version is not
  // prompted for unless the person checks for updates themselves.
  let offeredVersion: string | null = null;
  let promptedVersion: string | null = null;
  let promptRequested = false;
  let checking: Promise<void> | null = null;

  autoUpdater.autoDownload = settings.autoDownload;
  autoUpdater.autoInstallOnAppQuit = true;

  /** Persists what the dialog was answered: the checkbox, and whether this version is skipped. */
  const record = (version: string, choice: 'install' | 'download' | 'later' | 'skip', autoDownload: boolean): void => {
    settings.autoDownload = autoDownload;
    autoUpdater.autoDownload = autoDownload;
    settings.skippedVersion = choice === 'skip' ? version : null;
    autoUpdater.autoInstallOnAppQuit = choice !== 'skip';
    saveSettings();
  };

  /** The update is downloaded: install now, on quit, or skip. */
  const promptToInstall = async (version: string): Promise<void> => {
    promptedVersion = version;

    const { choice, autoDownload } = await showUpdateDialog({ kind: 'ready', version, autoDownload: settings.autoDownload, parent: getWindow() });

    record(version, choice, autoDownload);

    if (choice === 'install') {
      installUpdate();
    }
  };

  /** Automatic downloads are off: ask before downloading. */
  const promptToDownload = async (version: string): Promise<void> => {
    offeredVersion = version;

    const { choice, autoDownload } = await showUpdateDialog({ kind: 'available', version, autoDownload: settings.autoDownload, parent: getWindow() });

    record(version, choice, autoDownload);

    if (choice === 'download') {
      promptRequested = true;
      autoUpdater.downloadUpdate().catch((error: unknown) => {
        console.warn('[flexkit] Update download failed:', error instanceof Error ? error.message : error);
      });
    }
  };

  autoUpdater.on('update-downloaded', (info) => {
    downloadedVersion = info.version;
    getWindow()?.webContents.send(IPC.updateDownloaded, { version: info.version });
    // A skipped version stays out of the quit-time install, also after a relaunch.
    autoUpdater.autoInstallOnAppQuit = info.version !== settings.skippedVersion;

    const requested = promptRequested;

    promptRequested = false;

    if (promptedVersion === info.version || (!requested && info.version === settings.skippedVersion)) {
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
        await showSheet({
          type: 'error',
          title: 'Update check failed',
          message: 'Flexkit Studio could not check for updates.',
          detail: error instanceof Error ? error.message : String(error),
        });
      }

      return;
    }

    if (!result?.isUpdateAvailable) {
      if (interactive) {
        await showSheet({
          type: 'info',
          title: 'Up to date',
          message: "You're up to date!",
          detail: `Flexkit Studio ${app.getVersion()} is currently the newest version available.`,
        });
      }

      return;
    }

    const { version } = result.updateInfo;

    // Already downloaded in this run (the background check prompted, or the
    // dialog was dismissed): offer to install, never to download again.
    if (downloadedVersion === version) {
      if (interactive || (promptedVersion !== version && version !== settings.skippedVersion)) {
        await promptToInstall(version);
      }

      return;
    }

    if (!settings.autoDownload) {
      if (interactive || (offeredVersion !== version && version !== settings.skippedVersion)) {
        await promptToDownload(version);
      }

      return;
    }

    if (!interactive) {
      return;
    }

    // The download is under way (`autoDownload`); `update-downloaded` then
    // prompts, even for a version that was skipped before.
    promptRequested = true;
    await showSheet({
      type: 'info',
      title: 'Update available',
      message: 'A new version of Flexkit Studio is available!',
      detail: `Flexkit Studio ${version} is downloading in the background. You'll be asked to install it as soon as it's ready.`,
    });
  };

  function checkForUpdates(interactive = false): Promise<void> {
    const run = (): Promise<void> => {
      checking = check(interactive).finally(() => {
        checking = null;
      });

      return checking;
    };

    if (checking === null) {
      return run();
    }

    // A background check is running: a manual one follows it (and reports),
    // another background one just shares it.
    return interactive ? checking.then(run, run) : checking;
  }

  void checkForUpdates();
  setInterval(() => void checkForUpdates(), CHECK_INTERVAL_MS).unref();

  return { checkForUpdates, getDownloadedVersion: () => downloadedVersion };
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
