import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/hmac.test.ts', 'tests/handler.test.ts', 'tests/define-tools.test.ts', 'tests/dev-connect.test.ts'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
  external: ['zod'],
});
