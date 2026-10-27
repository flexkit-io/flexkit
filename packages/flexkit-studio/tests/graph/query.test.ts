import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Entity } from '../../src/core/types';
import {
  captionFromRecord,
  collectRecords,
  entityOfRootField,
  exampleQueries,
  graphFromQueryResult,
  queryStorageKey,
  tableFromResult,
} from '../../src/apps/graph/query';

const brand: Entity = {
  name: 'brand',
  plural: 'brands',
  attributes: [
    { name: 'title', label: 'Title', dataType: 'string', inputType: 'text', scope: 'global' },
    {
      name: 'products',
      label: 'Products',
      dataType: 'string',
      inputType: 'relationship',
      scope: 'relationship',
      relationship: { entity: 'product', mode: 'multiple', field: 'brand' },
    },
  ],
};

const product: Entity = {
  name: 'product',
  plural: 'products',
  display: 'name',
  menu: { label: 'Catalogue' },
  attributes: [
    { name: 'sku', label: 'SKU', dataType: 'string', inputType: 'text', scope: 'global' },
    { name: 'name', label: 'Name', dataType: 'string', inputType: 'text', scope: 'local' },
    {
      name: 'brand',
      label: 'Brand',
      dataType: 'string',
      inputType: 'relationship',
      scope: 'relationship',
      relationship: { entity: 'brand', mode: 'single', field: 'products' },
    },
    {
      name: 'images',
      label: 'Images',
      dataType: 'string',
      inputType: 'relationship',
      scope: 'relationship',
      relationship: { entity: '_asset', mode: 'multiple', field: 'products' },
    },
  ],
};

const schema = [product, brand];

describe('collectRecords', () => {
  it('finds records in lists, single objects and connections', () => {
    assert.deepEqual(
      collectRecords([{ _id: 'a' }, { _id: 'b' }]).map((r) => r._id),
      ['a', 'b']
    );
    assert.deepEqual(
      collectRecords({ _id: 'a' }).map((r) => r._id),
      ['a']
    );
    assert.deepEqual(
      collectRecords({ edges: [{ node: { _id: 'a' } }, { node: null }], totalCount: 2 }).map((r) => r._id),
      ['a']
    );
    assert.deepEqual(collectRecords('x'), []);
    assert.deepEqual(collectRecords({ aggregate: { count: 3 } }), []);
  });
});

describe('entityOfRootField', () => {
  it('maps a plural or a connection to its entity', () => {
    assert.equal(entityOfRootField('products', schema)?.name, 'product');
    assert.equal(entityOfRootField('productsConnection', schema)?.name, 'product');
    assert.equal(entityOfRootField('productsTotal', schema), undefined);
  });
});

describe('captionFromRecord', () => {
  it('prefers the display attribute, then any string, then the id', () => {
    assert.equal(captionFromRecord({ _id: 'p1', name: [{ en: 'Parka' }], sku: 'A1' }, product, 'en'), 'Parka');
    assert.equal(captionFromRecord({ _id: 'p1', sku: 'A1' }, product, 'en'), 'A1');
    assert.equal(captionFromRecord({ _id: 'p1', __typename: 'product', count: 3 }, product, 'en'), 'p1');
  });
});

describe('graphFromQueryResult', () => {
  it('turns nested selections into nodes and edges, both ways round', () => {
    const data = {
      products: [
        { _id: 'p1', name: [{ en: 'Parka' }], brand: [{ _id: 'b1', title: 'Fjell' }], images: [{ _id: 'img' }] },
        { _id: 'p2', sku: 'V1', brandConnection: { edges: [{ node: { _id: 'b1', title: 'Fjell' } }] } },
      ],
      brandsConnection: { edges: [{ node: { _id: 'b2', title: 'Vinter', products: [{ _id: 'p3', sku: 'S1' }] } }] },
      productsTotal: 3,
    };
    const { nodes, edges } = graphFromQueryResult({ data, schema, scope: 'en' });

    assert.deepEqual(
      nodes.map((node) => [node.key, node.label]),
      [
        ['product:p1', 'Parka'],
        ['brand:b1', 'Fjell'],
        ['product:p2', 'V1'],
        ['brand:b2', 'Vinter'],
        ['product:p3', 'S1'],
      ]
    );
    assert.deepEqual(edges.map((edge) => edge.key).sort(), [
      'brand:b1|product:p1|products',
      'brand:b1|product:p2|products',
      'brand:b2|product:p3|products',
    ]);
  });

  it('ignores fields the schema does not know and empty results', () => {
    assert.deepEqual(
      graphFromQueryResult({ data: { knowledgeSources: [{ _id: 'k' }] }, schema, scope: 'en' }).nodes,
      []
    );
    assert.deepEqual(graphFromQueryResult({ data: null, schema, scope: 'en' }).nodes, []);
  });
});

describe('exampleQueries', () => {
  it('writes one query per entity with relationships', () => {
    const examples = exampleQueries(schema, 'en');

    assert.deepEqual(
      examples.map((example) => example.title),
      ['Catalogue', 'brands']
    );
    assert.match(examples[0]!.query, /products\(limit: 25\)/);
    assert.match(examples[0]!.query, /name \{ default en \}/);
    assert.match(examples[0]!.query, /brand\(limit: 5\) \{\n {6}_id\n {6}title\n {4}\}/);
    assert.doesNotMatch(examples[0]!.query, /images/);
  });
});

describe('tableFromResult', () => {
  it('flattens root records to one column per field', () => {
    const table = tableFromResult(
      {
        products: [
          { _id: 'p1', name: [{ en: 'Parka' }], brand: [{ _id: 'b1' }], price: 12.5, flag: null },
          { _id: 'p2', sku: 'V1' },
        ],
      },
      'en'
    );

    assert.deepEqual(table.columns, ['_id', 'name', 'brand', 'price', 'flag', 'sku']);
    assert.deepEqual(table.rows[0], { _id: 'p1', name: 'Parka', brand: '1 record', price: '12.5', flag: '', sku: '' });
    assert.equal(table.total, 2);
  });
});

describe('queryStorageKey', () => {
  it('is per project', () => {
    assert.equal(queryStorageKey('abc'), 'flexkit-graph:query:abc');
  });
});
