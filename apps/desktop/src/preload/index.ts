import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { FlexkitDesktopBridge } from '@flexkit/studio';
import { IPC, VERSION_ARGUMENT } from '../main/constants';

const version = process.argv.find((argument) => argument.startsWith(VERSION_ARGUMENT))?.slice(VERSION_ARGUMENT.length) ?? '0.0.0';

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
  onUpdateDownloaded: (listener) => subscribe<{ version: string }>(IPC.updateDownloaded, listener),
};

contextBridge.exposeInMainWorld('flexkitDesktop', bridge);
