import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  treeshake: true,
  splitting: true,
  entry: ['src/index.ts', 'src/ssr.ts', 'src/plugins.ts', 'src/ui.ts', 'src/data-grid.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  minify: !options.watch,
  external: ['react', 'react-dom', '@flexkit/core', '@flexkit/asset-manager', '@flexkit/desk', '@flexkit/explorer'],
}));
