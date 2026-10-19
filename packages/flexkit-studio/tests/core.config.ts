import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'tests/json-schema-to-zod.test.ts',
    'tests/icon-name.test.ts',
    'tests/project-schemas.test.ts',
    'tests/rating-preview.test.ts',
    'tests/last-project.test.ts',
    'tests/proxy-target.test.ts',
    'tests/project-label.test.ts',
    'tests/hosted-session.test.ts',
    'tests/bff-session.test.ts',
    'tests/project-schema-key.test.ts',
    'tests/schema-deploy-watch.test.ts',
    'tests/app-sessions.test.ts',
    'tests/electron-api.test.ts',
  ],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
  external: ['react', 'react-dom', 'react-router-dom', 'swr', 'zod', '@flexkit/schema'],
});
