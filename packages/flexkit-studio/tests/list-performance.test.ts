import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse, Kind } from 'graphql';
import type { FieldNode, OperationDefinitionNode } from 'graphql';
import { getEntityQuery, mapQueryResult } from '../src/graphql-client/queries';
import { tagSchema } from '../src/entities/tags-schema';
import type { Entity } from '../src/core/types';
import { shouldLoadMore } from '../src/data-grid/should-load-more';

function fields(query: string): readonly FieldNode[] {
  const operation = parse(query).definitions[0] as OperationDefinitionNode;
  return operation.selectionSet.selections.filter((node): node is FieldNode => node.kind === Kind.FIELD);
}

test('tag selectors request names without traversing assets or counting the collection', () => {
  const { query } = getEntityQuery('_tags', 'default', [tagSchema], { selection: 'display', includeCount: false });
  const root = fields(query);
  assert.deepEqual(
    root.map((field) => field.name.value),
    ['_tags']
  );
  assert.deepEqual(
    root[0].selectionSet?.selections.map((field) => (field as FieldNode).name.value),
    ['_id', '_updatedAt', 'name']
  );
  const mapped = mapQueryResult(
    '_tags',
    'default',
    { _tags: [{ __typename: '_tag', _id: 'tag-1', name: 'Featured' }] },
    [tagSchema]
  );
  assert.equal(mapped.results[0].name, 'Featured');
  assert.equal(mapped.results[0]._id, 'tag-1');
  // A real tag grid still needs its bounded previews and exact overflow badge.
  const grid = getEntityQuery('_tags', 'default', [tagSchema], { selection: 'list' }).query;
  assert.match(grid, /assetsConnection\(first: 3\)/);
  assert.match(grid, /aggregate/);
});

const product: Entity = {
  name: 'product',
  plural: 'products',
  display: 'title',
  attributes: [
    { name: 'title', label: 'Title', scope: 'local', dataType: 'string', inputType: 'text' },
    { name: 'secretImage', label: 'Secret', scope: 'global', dataType: 'asset', inputType: 'asset', hidden: true },
    { name: 'image', label: 'Image', scope: 'global', dataType: 'asset', inputType: 'asset' },
  ],
};

test('display selection preserves localized labels and omits unrelated fields', () => {
  const query = getEntityQuery('products', 'es', [product], { selection: 'display', includeCount: false }).query;
  assert.match(query, /title\s*\{\s*_id\s*default\s*es/);
  assert.doesNotMatch(query, /secretImage|\bimage\b|Connection|Total/);
});

test('hidden assets are omitted from grid queries but remain available in forms', () => {
  const list = getEntityQuery('products', 'default', [product], { selection: 'list' }).query;
  assert.doesNotMatch(list, /secretImage/);
  assert.match(list, /image\s*\{/);
  const full = getEntityQuery('products', 'default', [product], { includeCount: false }).query;
  assert.match(full, /secretImage\s*\{/);
  assert.match(full, /lqip/);
  assert.doesNotMatch(full, /productsConnection|productsTotal/);
});

test('pagination omits only the top-level count, preserving relationship preview counts', () => {
  const query = getEntityQuery('_tags', 'default', [tagSchema], { selection: 'list', includeCount: false }).query;
  assert.deepEqual(
    fields(query).map((field) => field.name.value),
    ['_tags']
  );
  assert.match(query, /assetsConnection\(first: 3\)/);
  assert.match(query, /count\s*\{\s*nodes/);
});

test('grid startup fills the viewport without speculatively fetching a second page', () => {
  // 36 rows at 36px, a 40px header and 80px bottom padding in an 800px viewport.
  assert.equal(shouldLoadMore({ scrollHeight: 1416, scrollTop: 0, clientHeight: 800 }), false);
  assert.equal(shouldLoadMore({ scrollHeight: 800, scrollTop: 0, clientHeight: 800 }), true);
  assert.equal(shouldLoadMore({ scrollHeight: 800, scrollTop: 0, clientHeight: 0 }), false);
  // Scrolling retains the original viewport-ahead prefetch window.
  assert.equal(shouldLoadMore({ scrollHeight: 1416, scrollTop: 100, clientHeight: 800 }), true);
  assert.equal(shouldLoadMore({ scrollHeight: 3000, scrollTop: 100, clientHeight: 800 }), false);
});
