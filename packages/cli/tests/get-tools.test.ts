import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { loadEnvFiles } from '../src/util/env-file';
import { CantFindToolsFile, InvalidToolsFile, loadToolsDefinition, resolveToolsFile } from '../src/util/get-tools';
import type { Output } from '../src/util/output';

const output = { debug: () => undefined } as unknown as Output;

const toolsSource = `
import { defineSkill, defineTool, defineTools } from '@flexkit/tools';
import { z } from 'zod';

export const ping = defineTool({
  name: 'ping',
  description: 'Echo a message.',
  input: z.object({ message: z.string() }),
  execute: ({ message }) => ({ echo: message, secret: process.env.PING_SECRET }),
});

export default defineTools({
  tools: [ping],
  skills: [defineSkill({ name: 'Forecast', description: 'd', content: 'c' })],
});
`;

let workDir: string;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flexkit-cli-tools-'));
  // A customer project has @flexkit/tools and zod in its own node_modules; point
  // the temp project at the workspace copies.
  const toolsPackage = path.resolve('..', 'tools');
  fs.mkdirSync(path.join(workDir, 'node_modules', '@flexkit'), { recursive: true });
  fs.symlinkSync(toolsPackage, path.join(workDir, 'node_modules', '@flexkit', 'tools'), 'dir');
  fs.symlinkSync(path.join(toolsPackage, 'node_modules', 'zod'), path.join(workDir, 'node_modules', 'zod'), 'dir');
});

afterEach(() => {
  fs.rmSync(workDir, { force: true, recursive: true });
  delete process.env.PING_SECRET;
});

describe('resolveToolsFile', () => {
  it('finds the default candidates and validates explicit paths', () => {
    assert.throws(() => resolveToolsFile(workDir), CantFindToolsFile);

    fs.writeFileSync(path.join(workDir, 'flexkit.tools.ts'), toolsSource);
    assert.equal(resolveToolsFile(workDir), path.join(workDir, 'flexkit.tools.ts'));
    assert.equal(resolveToolsFile(workDir, 'flexkit.tools.ts'), path.join(workDir, 'flexkit.tools.ts'));
    assert.throws(() => resolveToolsFile(workDir, 'missing.ts'), CantFindToolsFile);
  });
});

describe('loadToolsDefinition', () => {
  it('bundles the file and returns the definition with eager input schemas', async () => {
    const file = path.join(workDir, 'flexkit.tools.ts');
    fs.writeFileSync(file, toolsSource);

    const definition = await loadToolsDefinition(output, file);

    assert.deepEqual(
      definition.tools.map((tool) => tool.name),
      ['ping']
    );
    assert.equal(definition.tools[0]!.inputSchema.type, 'object');
    assert.equal(definition.skills[0]!.name, 'Forecast');
    assert.deepEqual(
      await definition.tools[0]!.execute({ message: 'hi' }, { kind: 'chat', role: 'owner', spaceCodes: [], userId: 'u' }),
      { echo: 'hi', secret: undefined }
    );
    assert.deepEqual(fs.readdirSync(workDir).filter((entry) => entry.endsWith('-temp.mjs')), []);
  });

  it('rejects files without a defineTools default export', async () => {
    const file = path.join(workDir, 'flexkit.tools.ts');

    fs.writeFileSync(file, `export const nothing = 1;`);
    await assert.rejects(loadToolsDefinition(output, file), (error: unknown) => {
      assert.ok(error instanceof InvalidToolsFile);
      assert.match(error.message, /export the result of defineTools\(\)/);

      return true;
    });

    fs.writeFileSync(file, `export default { tools: [{ name: 'x' }] };`);
    await assert.rejects(loadToolsDefinition(output, file), /not a tools definition/);

    fs.writeFileSync(file, `export default defineTools({});`);
    await assert.rejects(loadToolsDefinition(output, file), InvalidToolsFile);
  });
});

describe('loadEnvFiles', () => {
  it('loads defaults when present, explicit files strictly, and never overrides existing variables', () => {
    assert.deepEqual(loadEnvFiles(workDir, undefined), { loaded: [], unsupported: false });

    fs.writeFileSync(path.join(workDir, '.env'), 'PING_SECRET=from-env\n');
    fs.writeFileSync(path.join(workDir, '.env.local'), 'PING_SECRET=from-local\n');
    assert.deepEqual(loadEnvFiles(workDir, undefined), { loaded: ['.env.local', '.env'], unsupported: false });
    assert.equal(process.env.PING_SECRET, 'from-local');

    assert.throws(() => loadEnvFiles(workDir, ['missing.env']), /Environment file not found/);
  });
});
