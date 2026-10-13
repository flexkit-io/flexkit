import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import getConfig, { resetConfigCache } from '../src/util/get-config';
import { InvalidProjectConfig, CantFindConfig } from '../src/util/error-types';
import type { Output } from '../src/util/output';

const output = { debug: () => undefined } as unknown as Output;

const configSource = `
import { defineConfig, defineEntity } from '@flexkit/schema';

export default defineConfig({
  title: 'Shop',
  projectId: 'abcdefghij',
  menuGroups: [{ name: 'catalog', title: 'Catalog' }],
  scopes: [{ name: 'default', label: 'Default', isDefault: true }],
  spaces: [{ code: 'sales', label: 'Sales' }],
  schema: [
    defineEntity({
      name: 'product',
      plural: 'products',
      menu: { group: 'catalog', icon: 'Tag' },
      attributes: [
        {
          name: 'name',
          label: 'Name',
          dataType: 'string',
          inputType: 'text',
          scope: 'global',
          validation: (z) => z.string().min(1, { error: 'Name is required' }),
        },
        {
          name: 'email',
          label: 'Email',
          dataType: 'string',
          inputType: 'text',
          scope: 'global',
          readOnly: true,
          validation: (z) => z.email(),
        },
        { name: 'cover', label: 'Cover', dataType: 'asset', inputType: 'asset' },
      ],
    }),
  ],
});
`;

let workDir: string;
let previousCwd: string;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flexkit-cli-config-'));
  previousCwd = process.cwd();
  process.chdir(workDir);
  resetConfigCache();
});

afterEach(() => {
  process.chdir(previousCwd);
  fs.rmSync(workDir, { recursive: true, force: true });
  resetConfigCache();
});

describe('getConfig', () => {
  it('bundles flexkit.config.ts and serializes it to the deploy payload', async () => {
    fs.writeFileSync(path.join(workDir, 'flexkit.config.ts'), configSource);

    const config = await getConfig(output);

    assert.ok(!(config instanceof Error), config instanceof Error ? config.message : '');
    assert.equal(config.projects.length, 1);
    const [project] = config.projects;
    assert.equal(project?.title, 'Shop');
    assert.deepEqual(project?.menuGroups, [{ name: 'catalog', title: 'Catalog' }]);
    assert.deepEqual(project?.schema[0]?.menu, { group: 'catalog', icon: 'Tag' });
    assert.deepEqual(project?.schema[0]?.attributes[0]?.validation, { type: 'string', minLength: 1 });
    assert.equal(project?.schema[0]?.attributes[1]?.validation?.format, 'email');
    assert.equal(project?.schema[0]?.attributes[2]?.scope, 'global');
    assert.equal(JSON.stringify(config.projects).includes('"basePath"'), false);
    assert.equal(fs.readdirSync(workDir).some((file) => file.endsWith('-temp.mjs')), false);
  });

  it('accepts configs that still import defineConfig from @flexkit/studio', async () => {
    fs.writeFileSync(
      path.join(workDir, 'flexkit.config.ts'),
      configSource.replace("from '@flexkit/schema'", "from '@flexkit/studio'")
    );

    const config = await getConfig(output);

    assert.ok(!(config instanceof Error), config instanceof Error ? config.message : '');
    assert.equal(config.projects[0]?.projectId, 'abcdefghij');
  });

  it('fails fast when a validation cannot be expressed as JSON Schema, naming the attribute', async () => {
    fs.writeFileSync(
      path.join(workDir, 'flexkit.config.ts'),
      configSource.replace('z.string().min(1, { error: \'Name is required\' })', 'z.string().refine((v) => v !== "x")')
    );

    const config = await getConfig(output);

    assert.ok(config instanceof InvalidProjectConfig);
    assert.match(config.meta.error, /Attribute "name" of entity "product": validation uses refine\(\)/);
  });

  it('refuses flexkit.config.tsx with migration guidance', async () => {
    fs.writeFileSync(path.join(workDir, 'flexkit.config.tsx'), configSource);

    const discovered = await getConfig(output);
    assert.ok(discovered instanceof InvalidProjectConfig);
    assert.match(discovered.meta.error, /no longer supported/);

    resetConfigCache();
    const explicit = await getConfig(output, 'flexkit.config.tsx');
    assert.ok(explicit instanceof InvalidProjectConfig);
    assert.match(explicit.meta.error, /lucide icon names/);
  });

  it('reports a missing config', async () => {
    assert.ok((await getConfig(output)) instanceof CantFindConfig);
  });
});
