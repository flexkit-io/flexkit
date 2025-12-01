import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  treeshake: true,
  splitting: true,
  entry: ['src/**/*.tsx'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  minify: !options.watch,
  external: ['react', 'react-dom'],
}));
