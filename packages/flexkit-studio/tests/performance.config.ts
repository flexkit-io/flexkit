import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/list-performance.test.ts', 'tests/editor-preview.test.ts'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
  noExternal: ['novel', 'react-tweet'],
  loader: { '.css': 'empty' },
});
