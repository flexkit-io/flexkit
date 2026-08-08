import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  banner: {
    js: "import './index.css';",
  },
  dts: true,
  entry: ['src/**/*.tsx'],
  external: ['react'],
  format: ['esm'],
  minify: !options.watch,
  platform: 'browser',
  sourcemap: true,
  splitting: true,
  treeshake: true,
}));
