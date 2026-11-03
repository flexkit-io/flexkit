import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'tests/get-config.test.ts',
    'tests/get-tools.test.ts',
    'tests/dev-events.test.ts',
    'tests/cli-foundations.test.ts',
    'tests/schema-diff.test.ts',
    'tests/records.test.ts',
    'tests/search.test.ts',
    'tests/automations.test.ts',
    'tests/runs.test.ts',
    'tests/approvals.test.ts',
    'tests/chat.test.ts',
    'tests/activity.test.ts',
    'tests/skills.test.ts',
    'tests/knowledge.test.ts',
    'tests/plugins.test.ts',
    'tests/mcp.test.ts',
    'tests/usage.test.ts',
  ],
  format: ['esm'],
  outDir: 'build/tests',
  removeNodeProtocol: false,
  // Bundled CommonJS dependencies (chalk, cli-table3, …) call require().
  banner: { js: "import { createRequire as __flexkitCreateRequire } from 'node:module'; const require = __flexkitCreateRequire(import.meta.url);" },
  external: ['esbuild', '@flexkit/schema', '@flexkit/tools'],
});
