import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/data-parts.test.ts'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
});
