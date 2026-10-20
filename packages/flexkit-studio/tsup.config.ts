import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig((options) => ({
  banner: {
    js: "import './index.css';",
  },
  treeshake: true,
  splitting: true,
  entry: {
    index: 'src/index.tsx',
    icons: 'src/icons.ts',
    ui: 'src/ui.tsx',
  },
  format: ['esm'],
  platform: 'browser',
  dts: true,
  sourcemap: true,
  minify: !options.watch,
  external: ['react', 'react-dom'],
  // The version the app bar shows for the web Studio (see core/use-studio-version.ts).
  define: {
    __STUDIO_VERSION__: JSON.stringify(version),
  },
}));
