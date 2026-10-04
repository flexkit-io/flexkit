import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/model-selection.test.ts', 'tests/status-label.test.ts'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
});
