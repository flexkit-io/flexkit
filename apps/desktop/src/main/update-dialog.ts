import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow, ipcMain, nativeImage, nativeTheme } from 'electron';
import { UPDATE_DIALOG_CHOICE, UPDATE_DIALOG_SIZE } from './update-dialog-channels';
import { focusWindow } from './window';

export type UpdateDialogKind = 'ready' | 'available';
export type UpdateChoice = 'install' | 'download' | 'later' | 'skip';

export interface UpdateDialogOptions {
  kind: UpdateDialogKind;
  version: string;
  autoDownload: boolean;
  parent: BrowserWindow | null;
}

export interface UpdateDialogResult {
  choice: UpdateChoice;
  autoDownload: boolean;
}

/** What the preload sends back: the checkbox whenever it changes, and the choice when a button is pressed. */
export interface UpdateDialogResponse {
  choice: UpdateChoice | 'checkbox';
  autoDownload: boolean;
}

const WIDTH = 640;
const DARK_BACKGROUND = '#262626';
const LIGHT_BACKGROUND = '#ececec';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** The app icon as a data URL, for the dialog page (no file access from there). */
function iconDataUrl(): string | null {
  const candidates = [join(process.resourcesPath, 'icon.png'), join(app.getAppPath(), 'build', 'icon.png')];
  const path = candidates.find((candidate) => existsSync(candidate));

  if (!path) {
    return null;
  }

  const icon = nativeImage.createFromPath(path);

  return icon.isEmpty() ? null : icon.resize({ width: 128, height: 128 }).toDataURL();
}

function copy(kind: UpdateDialogKind, version: string): { title: string; body: string; buttons: Array<{ choice: UpdateChoice; label: string; primary?: boolean }> } {
  const name = 'Flexkit Studio';

  if (kind === 'ready') {
    return {
      title: `A new version of ${name} is ready to install!`,
      body: `${name} ${version} has been downloaded and is ready to use! Would you like to install it and relaunch ${name} now?`,
      buttons: [
        { choice: 'skip', label: 'Skip This Version' },
        { choice: 'later', label: 'Install on Quit' },
        { choice: 'install', label: 'Install and Relaunch', primary: true },
      ],
    };
  }

  return {
    title: `A new version of ${name} is available!`,
    body: `${name} ${version} is available. Would you like to download it now? You'll be asked before it installs.`,
    buttons: [
      { choice: 'skip', label: 'Skip This Version' },
      { choice: 'later', label: 'Remind Me Later' },
      { choice: 'download', label: 'Download', primary: true },
    ],
  };
}

function page(options: UpdateDialogOptions): string {
  const { title, body, buttons } = copy(options.kind, options.version);
  const icon = iconDataUrl();
  const buttonHtml = buttons
    .map(
      (button, index) =>
        `<button type="button" data-choice="${button.choice}"${button.primary ? ' class="primary"' : ''}${index === 0 ? ' data-first' : ''}>${escapeHtml(button.label)}</button>`
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  html, body { margin: 0; height: 100%; }
  body {
    font: 13px/1.45 -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #1d1d1f;
    background: ${LIGHT_BACKGROUND};
    -webkit-user-select: none;
    user-select: none;
    overflow: hidden;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #f5f5f7; background: ${DARK_BACKGROUND}; }
  }
  .drag { position: fixed; inset: 0 0 auto 0; height: 44px; -webkit-app-region: drag; }
  main { display: flex; flex-direction: column; gap: 14px; padding: 40px 24px 20px 24px; }
  .row { display: flex; gap: 18px; align-items: flex-start; }
  .icon { width: 64px; height: 64px; border-radius: 14px; flex: none; }
  h1 { font-size: 15px; font-weight: 600; margin: 4px 0 6px; }
  p { margin: 0; }
  label { display: flex; align-items: center; gap: 8px; margin-left: 2px; }
  input[type=checkbox] { width: 15px; height: 15px; margin: 0; accent-color: #007aff; }
  .buttons { display: flex; gap: 10px; }
  .buttons .spacer { flex: 1; }
  button {
    font: inherit; font-size: 13px; padding: 7px 18px; border: 0; border-radius: 999px; min-width: 150px;
    color: inherit; background: rgba(0, 0, 0, 0.08); cursor: default; -webkit-app-region: no-drag;
  }
  button:focus-visible { outline: 2px solid #007aff; outline-offset: 2px; }
  button.primary:focus-visible { outline-color: #fff; outline-offset: -4px; }
  button.primary { background: #007aff; color: #fff; font-weight: 600; }
  @media (prefers-color-scheme: dark) {
    button { background: rgba(255, 255, 255, 0.12); }
    button.primary { background: #0a84ff; }
  }
</style>
</head>
<body>
<div class="drag"></div>
<main>
  <div class="row">
    ${icon ? `<img class="icon" src="${icon}" alt="">` : ''}
    <div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(body)}</p>
    </div>
  </div>
  <label><input type="checkbox" id="auto"${options.autoDownload ? ' checked' : ''}> Automatically download and install updates in the future</label>
  <div class="buttons">${buttonHtml.replace('</button>', '</button><span class="spacer"></span>')}</div>
</main>
</body>
</html>`;
}

let current: BrowserWindow | null = null;

/** Brings the open update prompt to the front, if there is one. */
export function focusUpdateDialog(): boolean {
  if (current === null || current.isDestroyed()) {
    return false;
  }

  // Restores a minimized prompt too.
  focusWindow(current);

  return true;
}

/**
 * The update prompt, as its own small window (icon, title, text, the
 * auto-download checkbox and the choices in a row). Closing it counts as
 * "later". Only this window's page may answer.
 */
export function showUpdateDialog(options: UpdateDialogOptions): Promise<UpdateDialogResult> {
  const { parent } = options;
  const window = new BrowserWindow({
    width: WIDTH,
    height: 230,
    useContentSize: true,
    resizable: false,
    // Close and minimize stay; zoom is greyed out.
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title: 'Flexkit Studio Update',
    backgroundColor: nativeTheme.shouldUseDarkColors ? DARK_BACKGROUND : LIGHT_BACKGROUND,
    ...(parent && parent.isVisible() ? { parent } : {}),
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 14, y: 14 } } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/update-dialog.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.setMenuBarVisibility(false);
  current = window;

  return new Promise<UpdateDialogResult>((resolve) => {
    let settled = false;
    // Closing the window with its close button answers "later" with the
    // checkbox as last seen.
    let { autoDownload } = options;
    const settle = (result: UpdateDialogResult): void => {
      if (settled) {
        return;
      }

      settled = true;
      current = null;
      ipcMain.removeListener(UPDATE_DIALOG_SIZE, onSize);
      ipcMain.removeListener(UPDATE_DIALOG_CHOICE, onChoice);
      resolve(result);

      if (!window.isDestroyed()) {
        window.close();
      }
    };
    const fromDialog = (event: { sender: { id: number } }): boolean => !window.isDestroyed() && event.sender.id === window.webContents.id;
    const onSize = (event: Electron.IpcMainEvent, height: unknown): void => {
      if (fromDialog(event) && typeof height === 'number' && Number.isFinite(height) && height > 0) {
        window.setContentSize(WIDTH, Math.ceil(Math.min(height, 600)));

        if (parent && parent.isVisible()) {
          const bounds = parent.getBounds();
          const size = window.getSize();

          window.setPosition(
            Math.round(bounds.x + (bounds.width - size[0]) / 2),
            Math.round(bounds.y + (bounds.height - size[1]) / 3)
          );
        } else {
          window.center();
        }

        window.show();
        window.focus();
      }
    };
    const onChoice = (event: Electron.IpcMainEvent, response: unknown): void => {
      if (!fromDialog(event) || !response || typeof response !== 'object') {
        return;
      }

      const { choice, autoDownload: checked } = response as Partial<UpdateDialogResponse>;

      autoDownload = checked === true;

      if (choice === 'install' || choice === 'download' || choice === 'later' || choice === 'skip') {
        settle({ choice, autoDownload });
      }
    };

    ipcMain.on(UPDATE_DIALOG_SIZE, onSize);
    ipcMain.on(UPDATE_DIALOG_CHOICE, onChoice);
    window.on('closed', () => settle({ choice: 'later', autoDownload }));
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());

    void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page(options))}`);
  });
}
