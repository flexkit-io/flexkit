import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  banner: {
    js: "import './index.css';",
  },
  dts: true,
  entry: ['src/index.tsx'],
  external: ['react'],
  format: ['esm'],
  minify: !options.watch,
  platform: 'browser',
  sourcemap: true,
  splitting: false,
  treeshake: true,
}));
