import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/knowledge/knowledge.test.ts'],
  format: ['esm'],
  outDir: 'build/tests/knowledge',
  removeNodeProtocol: false,
});
