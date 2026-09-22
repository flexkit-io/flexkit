import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tests/extensions.test.tsx'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
  external: ['react', 'react-dom', 'react-router-dom', 'ramda'],
});
