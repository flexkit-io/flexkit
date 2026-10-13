import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/serialize.test.ts'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
});
