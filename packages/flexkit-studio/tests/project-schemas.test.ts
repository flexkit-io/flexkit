import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toProjectSchemasState } from '../src/core/config/use-project-schemas';
import { upsertReservedEntities } from '../src/core/config/config-context';
import type { Entity } from '../src/core/types';

const project = {
  projectId: 'abc',
  title: 'Shop',
  menuGroups: [],
  scopes: [],
  spaces: [],
  schema: [] as Entity[],
  schemaHash: 'v7-x',
};

describe('project schemas', () => {
  it('splits fetch outcomes into loaded projects and per-project errors', () => {
    const state = toProjectSchemasState(
      [
        { ok: true, project },
        { ok: false, projectId: 'missing', error: { status: 404, message: 'Not found' } },
      ],
      false
    );

    assert.deepEqual(state.projects, [project]);
    assert.deepEqual(state.errors, { missing: { status: 404, message: 'Not found' } });
    assert.equal(state.isLoading, false);
    assert.deepEqual(toProjectSchemasState(undefined, true), { projects: [], errors: {}, isLoading: true });
  });

  it('appends the reserved asset and tag entities exactly once', () => {
    const schema = upsertReservedEntities([{ name: 'product', plural: 'products', attributes: [] }]);
    const names = schema.map((entity) => entity.name);

    assert.equal(names[0], 'product');
    assert.equal(names.filter((name) => name === '_asset').length, 1);
    assert.equal(names.filter((name) => name === '_tag').length, 1);
    assert.deepEqual(upsertReservedEntities(schema).map((entity) => entity.name), names);
  });
});
