import { app, BrowserWindow, Menu, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { APP_ORIGIN } from './constants';

interface MenuOptions {
  getWindow: () => BrowserWindow | null;
  checkForUpdates: () => void;
}

export function buildApplicationMenu({ getWindow, checkForUpdates }: MenuOptions): Menu {
  const isMac = process.platform === 'darwin';

  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { label: 'Check for Updates…', click: checkForUpdates },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
      ]
    : [];

  const template: MenuItemConstructorOptions[] = [
    ...appMenu,
    {
      label: 'File',
      submenu: [
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => {
            getWindow()?.webContents.loadURL(`${APP_ORIGIN}/`);
          },
        },
        { type: 'separator' },
        ...(isMac ? [{ role: 'close' as const }] : [{ label: 'Check for Updates…', click: checkForUpdates }, { role: 'quit' as const }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [{ role: 'pasteAndMatchStyle' as const }, { role: 'delete' as const }, { role: 'selectAll' as const }]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }]),
      ],
    },
    {
      label: 'View',
      submenu: [
        // A reload throws away open chats and forms: only development builds
        // get the shortcuts; release builds keep "Reload Window" under Help
        // (no accelerator) for recovering from a stuck page.
        ...(app.isPackaged
          ? []
          : [
              { role: 'reload' as const },
              { role: 'forceReload' as const },
              { role: 'toggleDevTools' as const },
              { type: 'separator' as const },
            ]),
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Go',
      submenu: [
        {
          label: 'Back',
          accelerator: isMac ? 'Cmd+[' : 'Alt+Left',
          click: () => {
            getWindow()?.webContents.navigationHistory.goBack();
          },
        },
        {
          label: 'Forward',
          accelerator: isMac ? 'Cmd+]' : 'Alt+Right',
          click: () => {
            getWindow()?.webContents.navigationHistory.goForward();
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' as const }, { role: 'front' as const }] : [{ role: 'close' as const }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Flexkit Documentation',
          click: () => {
            void shell.openExternal('https://www.flexkit.io/docs');
          },
        },
        {
          label: 'Report an Issue',
          click: () => {
            void shell.openExternal('https://github.com/flexkit-io/flexkit/issues');
          },
        },
        { type: 'separator' },
        {
          label: 'flexkit.io',
          click: () => {
            void shell.openExternal('https://www.flexkit.io');
          },
        },
        ...(app.isPackaged
          ? [
              { type: 'separator' as const },
              {
                label: 'Reload Window',
                click: () => {
                  getWindow()?.webContents.reload();
                },
              },
            ]
          : []),
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
