import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { keepLoadedSchema, toProjectSchemasState } from '../src/core/config/use-project-schemas';
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

  it('keeps a loaded schema when a refetch fails', () => {
    const loaded = { ok: true as const, project };
    const offline = { ok: false as const, projectId: 'abc', error: { status: 0, message: 'Network error' } };
    const expired = { ok: false as const, projectId: 'abc', error: { status: 401, message: 'Unauthorized' } };
    const updated = { ok: true as const, project: { ...project, schemaHash: 'v8-y' } };

    assert.equal(keepLoadedSchema(loaded, offline), loaded);
    assert.equal(keepLoadedSchema(loaded, expired), loaded);
    assert.equal(keepLoadedSchema(loaded, updated), updated);
    // The first load still reports its error.
    assert.equal(keepLoadedSchema(undefined, expired), expired);
  });

  it('appends the reserved asset and tag entities exactly once', () => {
    const schema = upsertReservedEntities([{ name: 'product', plural: 'products', attributes: [] }]);
    const names = schema.map((entity) => entity.name);

    assert.equal(names[0], 'product');
    assert.equal(names.filter((name) => name === '_asset').length, 1);
    assert.equal(names.filter((name) => name === '_tag').length, 1);
    assert.deepEqual(
      upsertReservedEntities(schema).map((entity) => entity.name),
      names
    );
  });

  it('gives asset attributes the asset widgets whatever the schema says', () => {
    const [post] = upsertReservedEntities([
      {
        name: 'post',
        plural: 'posts',
        attributes: [
          { name: 'title', label: 'Title', dataType: 'string', scope: 'local', inputType: 'text', previewType: 'text' },
          { name: 'cover', label: 'Cover', dataType: 'asset', scope: 'global', inputType: 'image', previewType: 'text' },
        ],
      },
    ] as Parameters<typeof upsertReservedEntities>[0]);

    assert.deepEqual(
      post?.attributes.map(({ inputType, previewType }) => [inputType, previewType]),
      [
        ['text', 'text'],
        ['asset', 'asset'],
      ]
    );
  });
});
