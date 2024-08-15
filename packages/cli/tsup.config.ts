import { defineConfig } from 'tsup';

export default defineConfig({
  treeshake: true,
  splitting: true,
  entry: ['src/**/*.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  minify: true,
});
