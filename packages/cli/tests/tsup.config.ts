import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/get-config.test.ts'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
  external: ['esbuild', '@flexkit/schema'],
});
