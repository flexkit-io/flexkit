import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { FlexkitDesktopBridge } from '@flexkit/studio';
import { APP_ORIGIN, DOMAIN_ARGUMENT, IPC, VERSION_ARGUMENT } from '../main/constants';

function argument(prefix: string, fallback: string): string {
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const version = argument(VERSION_ARGUMENT, '0.0.0');
const domain = argument(DOMAIN_ARGUMENT, 'flexkit.io');

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => {
    listener(payload);
  };

  ipcRenderer.on(channel, handler);

  return () => {
    ipcRenderer.off(channel, handler);
  };
}

const bridge: FlexkitDesktopBridge = {
  platform: process.platform === 'darwin' || process.platform === 'win32' ? process.platform : 'linux',
  version,
  domain,
  loginCallback: 'flexkit://auth/callback',
  setBadgeCount: (count) => {
    ipcRenderer.send(IPC.setBadge, count);
  },
  focusWindow: () => {
    ipcRenderer.send(IPC.focusWindow);
  },
  installUpdate: () => {
    ipcRenderer.send(IPC.installUpdate);
  },
  onNavigate: (listener) => subscribe<string>(IPC.navigate, listener),
  onUpdateDownloaded: (listener) => {
    let active = true;
    const unsubscribe = subscribe<{ version: string }>(IPC.updateDownloaded, listener);

    // A download that finished before the Studio mounted (on the login page, say).
    void ipcRenderer.invoke(IPC.getUpdate).then((version: unknown) => {
      if (active && typeof version === 'string') {
        listener({ version });
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  },
};

// A popup opened on about:blank inherits this preload and then moves to a
// third-party page: the bridge is for the Studio's own origin only.
if (location.origin === APP_ORIGIN) {
  contextBridge.exposeInMainWorld('flexkitDesktop', bridge);
}
