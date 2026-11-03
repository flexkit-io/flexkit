import { defineConfig } from 'tsup';

export default defineConfig({
  // Every test file, so new command groups only add a file.
  entry: ['tests/*.test.ts'],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
  // Bundled CommonJS dependencies (chalk, cli-table3, …) call require().
  banner: {
    js: "import { createRequire as __flexkitCreateRequire } from 'node:module'; const require = __flexkitCreateRequire(import.meta.url);",
  },
  external: ['esbuild', '@flexkit/schema', '@flexkit/tools'],
});
