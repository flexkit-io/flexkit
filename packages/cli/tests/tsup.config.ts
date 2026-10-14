import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/get-config.test.ts', 'tests/get-tools.test.ts', 'tests/dev-events.test.ts'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
  external: ['esbuild', '@flexkit/schema', '@flexkit/tools'],
});
