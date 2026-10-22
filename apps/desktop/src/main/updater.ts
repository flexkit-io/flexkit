import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, dialog } from 'electron';
import type { BrowserWindow, MessageBoxOptions, MessageBoxReturnValue } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC } from './constants';
import { focusUpdateDialog, showUpdateDialog } from './update-dialog';
import { focusWindow } from './window';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Updates come from the GitHub release the app was published with. By
 * default they download in the background and a dialog then offers to
 * install (now, on quit, or skip that version); with automatic downloads
 * turned off the dialog asks before downloading. "Check for Updates…"
 * reports every outcome.
 *
 * The app decides about every version before anything is downloaded or
 * handed to the platform updater: a skipped version is not downloaded again
 * unless the person checks for updates themselves, and a downloaded update is
 * only staged for the quit-time install (Squirrel on macOS, the installer's
 * quit handler on Windows) once the person has chosen "Install on Quit",
 * because a staged update cannot be taken back. The Studio's app bar shows
 * "Restart to update" from that moment on.
 */
export interface Updater {
  /** `interactive`: the person asked (menu), so every outcome gets a dialog. */
  checkForUpdates: (interactive?: boolean) => Promise<void>;
  /** The version that installs on the next quit, if any: the Studio asks when it mounts. */
  getDownloadedVersion: () => string | null;
}

/** Persisted in the user-data folder. */
interface UpdateSettings {
  autoDownload: boolean;
  /** "Skip This Version": neither downloaded nor offered again. */
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

  /** Downloaded in this run and waiting for a decision (or installing on quit). */
  let downloadedVersion: string | null = null;
  /** Chosen to install on quit: staged with the platform updater, shown in the Studio. */
  let stagedVersion: string | null = null;
  // Each prompt shows once per version per run; a skipped version is not
  // prompted for unless the person checks for updates themselves.
  let offeredVersion: string | null = null;
  let promptedVersion: string | null = null;
  let checking: Promise<void> | null = null;
  let interactiveCheck: Promise<void> | null = null;
  // One prompt at a time: a second request brings the open one to the front.
  let prompt: Promise<void> | null = null;
  const withPrompt = (open: () => Promise<void>): Promise<void> => {
    if (prompt !== null) {
      focusUpdateDialog();

      return prompt;
    }

    prompt = open().finally(() => {
      prompt = null;
    });

    return prompt;
  };

  // Downloads and the quit-time install are both decided here, not by
  // electron-updater: `downloadUpdate` runs once a version is wanted, and the
  // platform updater only gets the file (`autoInstallOnAppQuit` at download
  // time) when the person has chosen to install on quit.
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  const download = (): void => {
    autoUpdater.downloadUpdate().catch((error: unknown) => {
      console.warn('[flexkit] Update download failed:', error instanceof Error ? error.message : error);
    });
  };

  /**
   * "Install on Quit": hands the downloaded file to the platform updater. The
   * second `downloadUpdate` finds the file in electron-updater's cache and
   * only repeats the staging step, this time with the quit-time flag on.
   */
  const stage = (version: string): void => {
    stagedVersion = version;
    autoUpdater.autoInstallOnAppQuit = true;
    download();
    getWindow()?.webContents.send(IPC.updateDownloaded, { version });
  };

  /** Persists what the dialog was answered: the checkbox, and whether this version is skipped. */
  const record = (version: string, choice: 'install' | 'download' | 'later' | 'skip', autoDownload: boolean): void => {
    settings.autoDownload = autoDownload;
    settings.skippedVersion = choice === 'skip' ? version : null;
    saveSettings();
  };

  /** The update is downloaded: install now, on quit, or skip. */
  const promptToInstall = (version: string): Promise<void> =>
    withPrompt(async () => {
      promptedVersion = version;

      const { choice, autoDownload } = await showUpdateDialog({ kind: 'ready', version, autoDownload: settings.autoDownload, parent: getWindow() });

      record(version, choice, autoDownload);

      if (choice === 'install') {
        installUpdate();
      } else if (choice === 'later') {
        stage(version);
      }
    });

  /** Automatic downloads are off: ask before downloading. */
  const promptToDownload = (version: string): Promise<void> =>
    withPrompt(async () => {
      offeredVersion = version;

      const { choice, autoDownload } = await showUpdateDialog({ kind: 'available', version, autoDownload: settings.autoDownload, parent: getWindow() });

      record(version, choice, autoDownload);

      if (choice === 'download') {
        download();
      }
    });

  /** Already installing on quit: offer to restart now (no skipping a staged update). */
  const promptToRestart = async (version: string): Promise<void> => {
    const { response } = await showSheet({
      type: 'info',
      title: 'Update ready',
      message: `Flexkit Studio ${version} installs when you quit.`,
      detail: 'Restart now to use it right away.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      installUpdate();
    }
  };

  autoUpdater.on('update-downloaded', (info) => {
    downloadedVersion = info.version;

    // The staging download after "Install on Quit" ends here too.
    if (promptedVersion !== info.version) {
      void promptToInstall(info.version);
    }
  });

  autoUpdater.on('error', (error) => {
    console.warn('[flexkit] Update check failed:', error.message);
  });

  const check = async (interactive: boolean): Promise<void> => {
    if (interactive && stagedVersion !== null) {
      await promptToRestart(stagedVersion);

      return;
    }

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

    // Already downloaded in this run (the dialog was dismissed or the version
    // skipped): offer to install, never to download again.
    if (downloadedVersion === version) {
      if (interactive || promptedVersion !== version) {
        await promptToInstall(version);
      }

      return;
    }

    // Decided before download: a skipped version comes back only when asked.
    if (!interactive && version === settings.skippedVersion) {
      return;
    }

    if (!settings.autoDownload) {
      if (interactive || offeredVersion !== version) {
        await promptToDownload(version);
      }

      return;
    }

    // `update-downloaded` then prompts.
    download();

    if (interactive) {
      await showSheet({
        type: 'info',
        title: 'Update available',
        message: 'A new version of Flexkit Studio is available!',
        detail: `Flexkit Studio ${version} is downloading in the background. You'll be asked to install it as soon as it's ready.`,
      });
    }
  };

  function checkForUpdates(interactive = false): Promise<void> {
    if (!interactive) {
      if (checking === null) {
        checking = check(false).finally(() => {
          checking = null;
        });
      }

      return checking;
    }

    // One manual check at a time; it waits for a background check so that it
    // reports, and repeated clicks share it (an open prompt comes to the front).
    if (interactiveCheck === null) {
      const run = (): Promise<void> => check(true);

      interactiveCheck = (checking ?? Promise.resolve()).then(run, run).finally(() => {
        interactiveCheck = null;
      });
    } else {
      focusUpdateDialog();
    }

    return interactiveCheck;
  }

  void checkForUpdates();
  setInterval(() => void checkForUpdates(), CHECK_INTERVAL_MS).unref();

  return { checkForUpdates, getDownloadedVersion: () => stagedVersion };
}

// One install at a time: electron-updater's macOS updater does not
// de-duplicate, and a second call would ask Squirrel to fetch again.
let installing = false;

autoUpdater.on('error', () => {
  installing = false;
});

/** Quits into the downloaded update (dialog and the Studio's "Restart to update"). */
export function installUpdate(): void {
  if (installing) {
    return;
  }

  installing = true;
  // On macOS `quitAndInstall` asks Squirrel to fetch the update itself when
  // the quit-time flag is off and the update is not staged yet (electron-updater
  // `MacUpdater`); an already staged update and Windows ignore the flag here.
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.quitAndInstall();
}
