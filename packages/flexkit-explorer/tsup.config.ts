import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  treeshake: true,
  splitting: true,
  entry: ['src/index.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  minify: !options.watch,
  external: ['react'],
}));
