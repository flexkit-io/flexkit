import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/status-label.test.ts'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
});
