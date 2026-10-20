import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

/** `flexkit.io` (production) or `flexkit.test` (local backend); baked into both processes. */
const flexkitDomain = process.env.FLEXKIT_DOMAIN?.trim() || 'flexkit.io';

export default defineConfig({
  main: {
    // `@flexkit/studio/electron` is a workspace package: bundle it so the
    // packaged app does not carry the whole Studio in node_modules.
    plugins: [externalizeDepsPlugin({ exclude: ['@flexkit/studio', 'electron-context-menu'] })],
    define: {
      __FLEXKIT_DOMAIN__: JSON.stringify(flexkitDomain),
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          'update-dialog': resolve(__dirname, 'src/preload/update-dialog.ts'),
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    define: {
      __FLEXKIT_DOMAIN__: JSON.stringify(flexkitDomain),
    },
    // The window always loads through the app's own scheme; in development the
    // main process forwards page requests to this server, so the HMR client
    // must be told where the server is instead of deriving it from the page URL.
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      hmr: { host: 'localhost', port: 5173, protocol: 'ws' },
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
});
