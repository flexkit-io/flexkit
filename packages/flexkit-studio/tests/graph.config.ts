import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/graph/graph.test.ts'],
  format: ['esm'],
  outDir: 'build/tests/graph',
  removeNodeProtocol: false,
});
