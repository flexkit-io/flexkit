import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/json-schema-to-zod.test.ts', 'tests/icon-name.test.ts', 'tests/project-schemas.test.ts'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
  external: ['react', 'react-dom', 'react-router-dom', 'swr', 'zod', '@flexkit/schema'],
});
