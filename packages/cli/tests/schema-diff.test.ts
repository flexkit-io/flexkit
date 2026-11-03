import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  diffFields,
  diffSchemas,
  formatDiffValue,
  hasBreakingChanges,
  stableStringify,
  summarizeDiff,
  type SchemaSnapshot,
} from '../src/commands/schema/diff';

function attribute(
  name: string,
  extra: Record<string, unknown> = {}
): SchemaSnapshot['schema'][number]['attributes'][number] {
  return { name, label: name, dataType: 'string', scope: 'global', inputType: 'text', ...extra };
}

function snapshot(overrides: Partial<SchemaSnapshot> = {}): SchemaSnapshot {
  return {
    schema: [
      {
        name: 'product',
        plural: 'products',
        attributes: [attribute('name'), attribute('price', { dataType: 'float' })],
      },
      { name: 'category', plural: 'categories', attributes: [attribute('title')] },
    ],
    scopes: [{ name: 'default', label: 'Default', isDefault: true }],
    spaces: [{ code: 'retail', label: 'Retail' }],
    menuGroups: [],
    ...overrides,
  };
}

describe('stableStringify', () => {
  it('ignores key order and undefined values', () => {
    assert.equal(stableStringify({ b: 1, a: { d: 2, c: undefined } }), stableStringify({ a: { d: 2 }, b: 1 }));
  });

  it('keeps array order', () => {
    assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]));
  });
});

describe('diffFields', () => {
  it('lists changed, added and removed keys, skipping ignored ones', () => {
    assert.deepEqual(
      diffFields({ name: 'a', label: 'A', hidden: true }, { name: 'b', label: 'B', unique: true }, ['name']),
      [
        { field: 'hidden', from: true, to: undefined },
        { field: 'label', from: 'A', to: 'B' },
        { field: 'unique', from: undefined, to: true },
      ]
    );
  });
});

describe('diffSchemas', () => {
  it('reports no changes for identical snapshots', () => {
    const diff = diffSchemas(snapshot(), snapshot());

    assert.equal(diff.hasChanges, false);
    assert.deepEqual(diff.issues, []);
  });

  it('flags removed entities and attributes as breaking and added ones as safe', () => {
    const local = snapshot({
      schema: [
        { name: 'product', plural: 'products', attributes: [attribute('name'), attribute('sku')] },
        { name: 'order', plural: 'orders', attributes: [attribute('number')] },
      ],
    });
    const diff = diffSchemas(snapshot(), local);
    const product = diff.entities.find((entity) => entity.name === 'product');

    assert.equal(diff.hasChanges, true);
    assert.deepEqual(
      diff.entities.map((entity) => [entity.kind, entity.name]),
      [
        ['changed', 'product'],
        ['added', 'order'],
        ['removed', 'category'],
      ]
    );
    assert.deepEqual(
      product?.attributes.map((change) => [change.kind, change.name]),
      [
        ['added', 'sku'],
        ['removed', 'price'],
      ]
    );
    assert.deepEqual(
      diff.issues.map((issue) => [issue.severity, issue.path]),
      [
        ['breaking', 'product.price'],
        ['breaking', 'category'],
      ]
    );
    assert.equal(hasBreakingChanges(diff), true);
    assert.deepEqual(summarizeDiff(diff), { added: 1, removed: 1, changed: 1, breaking: 2, blocking: 0, warnings: 0 });
  });

  it('flags a data type change as blocking and a scope change as a warning', () => {
    const local = snapshot({
      schema: [
        {
          name: 'product',
          plural: 'products',
          attributes: [
            attribute('name', { scope: 'local', label: 'Product name' }),
            attribute('price', { dataType: 'int' }),
          ],
        },
        { name: 'category', plural: 'categories', attributes: [attribute('title')] },
      ],
    });
    const diff = diffSchemas(snapshot(), local);
    const product = diff.entities[0];

    assert.deepEqual(
      diff.issues.map((issue) => [issue.severity, issue.path]),
      [
        ['blocking', 'product.price'],
        ['warning', 'product.name'],
      ]
    );
    assert.deepEqual(product?.attributes[0]?.changes, [
      { field: 'label', from: 'name', to: 'Product name' },
      { field: 'scope', from: 'global', to: 'local' },
    ]);
    assert.equal(hasBreakingChanges(diff), true);
  });

  it('only warns about non-breaking changes', () => {
    const local = snapshot({ spaces: [] });
    const diff = diffSchemas(snapshot(), local);

    assert.equal(diff.hasChanges, true);
    assert.deepEqual(diff.spaces, [{ kind: 'removed', key: 'retail', changes: [] }]);
    assert.equal(diff.issues[0]?.severity, 'warning');
    assert.equal(hasBreakingChanges(diff), false);
  });

  it('detects entity-level, scope, menu group and order changes', () => {
    const base = snapshot();
    const local = snapshot({
      schema: [
        { name: 'category', plural: 'categories', attributes: [attribute('title')] },
        {
          name: 'product',
          plural: 'products',
          menu: { group: 'catalog' },
          attributes: [attribute('price', { dataType: 'float' }), attribute('name')],
        },
      ],
      scopes: [
        { name: 'default', label: 'Default', isDefault: true },
        { name: 'es', label: 'Spanish' },
      ],
      menuGroups: [{ name: 'catalog', title: 'Catalog' }],
    });
    const diff = diffSchemas(base, local);
    const product = diff.entities.find((entity) => entity.name === 'product');

    assert.equal(diff.entitiesReordered, true);
    assert.equal(product?.attributesReordered, true);
    assert.deepEqual(product?.changes, [{ field: 'menu', from: undefined, to: { group: 'catalog' } }]);
    assert.deepEqual(diff.scopes, [{ kind: 'added', key: 'es', changes: [] }]);
    assert.deepEqual(diff.menuGroups, [{ kind: 'added', key: 'catalog', changes: [] }]);
    assert.deepEqual(diff.issues, []);
  });

  it('compares the title only when the local side sets one', () => {
    assert.equal(diffSchemas(snapshot({ title: 'Acme Store' }), snapshot()).hasChanges, false);
    assert.deepEqual(diffSchemas(snapshot({ title: 'Acme Store' }), snapshot({ title: 'Acme' })).title, {
      field: 'title',
      from: 'Acme Store',
      to: 'Acme',
    });
  });

  it('treats everything as added against an empty deployed schema', () => {
    const diff = diffSchemas({ schema: [] }, snapshot());

    assert.deepEqual(
      diff.entities.map((entity) => entity.kind),
      ['added', 'added']
    );
    assert.equal(hasBreakingChanges(diff), false);
  });
});

describe('formatDiffValue', () => {
  it('quotes strings, marks missing values and truncates long JSON', () => {
    assert.equal(formatDiffValue('Name'), '"Name"');
    assert.equal(formatDiffValue(undefined), '(unset)');
    assert.equal(formatDiffValue({ list: 'x'.repeat(100) }, 20).length, 20);
  });
});
