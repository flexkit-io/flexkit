import { defineConfig } from 'tsup';

export default defineConfig({
  treeshake: true,
  splitting: true,
  entry: ['src/index.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  minify: true,
  external: ['react'],
});
