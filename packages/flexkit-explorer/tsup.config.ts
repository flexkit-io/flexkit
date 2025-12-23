import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  banner: {
    js: "import './index.css';",
  },
  treeshake: true,
  splitting: true,
  entry: ['src/index.tsx'],
  format: ['esm'],
  platform: 'browser',
  dts: true,
  sourcemap: true,
  minify: !options.watch,
  external: ['react'],
}));
