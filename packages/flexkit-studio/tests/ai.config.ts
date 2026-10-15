import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/ai/model-selection.test.ts', 'tests/ai/status-label.test.ts', 'tests/ai/approval-parts.test.ts'],
  format: ['esm'],
  outDir: 'build/tests/ai',
  removeNodeProtocol: false,
});
