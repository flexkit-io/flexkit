import { defineConfig } from 'tsup';

export default defineConfig({
  treeshake: true,
  splitting: true,
  entry: ['src/**/*.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  minify: true,
  external: ['react'],
});
