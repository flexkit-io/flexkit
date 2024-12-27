import { defineConfig } from 'tsup';

export default defineConfig({
  treeshake: true,
  splitting: true,
  entry: ['src/**/*.ts'],
  format: ['cjs'],
  dts: true,
  minify: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'esbuild', '@flexkit/*', 'lucide-react'],
  noExternal: ['arg', 'chalk', 'fs-extra'],
});
