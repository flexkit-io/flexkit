import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Entity } from '../../src/core/types';
import {
  buildGraphQuery,
  captionOf,
  getDisplaySelection,
  getEntityColors,
  getGraphEntities,
  getRelationshipAttributes,
  graphFromRecords,
  GRAPH_PALETTE,
  nodeKey,
  RELATED_LIMIT,
} from '../../src/apps/graph/graph';

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

const country: Entity = {
  name: 'country',
  plural: 'countries',
  attributes: [{ name: 'code', label: 'Code', dataType: 'string', inputType: 'text', scope: 'global' }],
};

const asset: Entity = {
  name: '_asset',
  plural: '_assets',
  attributes: [{ name: 'path', label: 'Path', dataType: 'string', inputType: 'text', scope: 'global' }],
};

const schema = [product, brand, country, asset];

describe('relationship attributes', () => {
  it('skips asset relationships', () => {
    assert.deepEqual(
      getRelationshipAttributes(product).map((attribute) => attribute.name),
      ['brand']
    );
  });

  it('lists only entities with a drawable relationship', () => {
    assert.deepEqual(
      getGraphEntities(schema).map((entity) => entity.name),
      ['product', 'brand']
    );
  });
});

describe('display selection', () => {
  it('selects a global display attribute as a scalar', () => {
    assert.equal(getDisplaySelection(brand, 'default'), 'title');
  });

  it('selects the scope value of a local display attribute', () => {
    assert.equal(getDisplaySelection(product, 'en'), 'name { en }');
  });

  it('falls back to nothing without an entity', () => {
    assert.equal(getDisplaySelection(undefined, 'en'), '');
  });
});

describe('buildGraphQuery', () => {
  it('fetches the sample with each drawable relationship and its display value', () => {
    const query = buildGraphQuery({ entity: product, schema, scope: 'en' });

    assert.match(query, /products\(limit: \$limit\)/);
    assert.match(query, /name \{ en \}/);
    assert.match(query, new RegExp(`brand\\(limit: ${RELATED_LIMIT}\\) \\{ _id title \\}`));
    assert.doesNotMatch(query, /images/);
  });
});

describe('captionOf', () => {
  it('reads a global display value', () => {
    assert.equal(captionOf({ _id: 'b1', title: 'Fjell' }, brand, 'en'), 'Fjell');
  });

  it('reads the scope value of a local display attribute', () => {
    assert.equal(captionOf({ _id: 'p1', name: [{ en: 'Parka', de: 'Parka DE' }] }, product, 'en'), 'Parka');
  });

  it('falls back to the id when the value is missing', () => {
    assert.equal(captionOf({ _id: 'p1', name: [] }, product, 'en'), 'p1');
    assert.equal(captionOf({ _id: 'c1' }, undefined, 'en'), 'c1');
  });
});

describe('graphFromRecords', () => {
  it('turns records and their related records into deduplicated nodes and edges', () => {
    const records = [
      { _id: 'p1', name: [{ en: 'Parka' }], brand: [{ _id: 'b1', title: 'Fjell' }] },
      { _id: 'p2', name: [{ en: 'Vest' }], brand: [{ _id: 'b1', title: 'Fjell' }] },
      { _id: 'p3', name: [{ en: 'Shell' }], brand: [] },
    ];
    const { nodes, edges } = graphFromRecords({ records, entity: product, schema, scope: 'en' });

    assert.deepEqual(
      nodes.map((node) => node.key),
      [nodeKey('product', 'p1'), nodeKey('brand', 'b1'), nodeKey('product', 'p2'), nodeKey('product', 'p3')]
    );
    assert.equal(nodes[1].label, 'Fjell');
    assert.equal(nodes[1].entity, 'brand');
    assert.deepEqual(
      edges.map((edge) => [edge.source, edge.target, edge.label]),
      [
        ['product:p1', 'brand:b1', 'brand'],
        ['product:p2', 'brand:b1', 'brand'],
      ]
    );
  });

  it('keeps one edge per pair whichever side it was fetched from', () => {
    const records = [{ _id: 'b1', title: 'Fjell', products: [{ _id: 'p1', name: [{ en: 'Parka' }] }] }];
    const { edges } = graphFromRecords({ records, entity: brand, schema, scope: 'en' });

    assert.deepEqual(
      edges.map((edge) => edge.key),
      ['brand:b1|product:p1']
    );
  });
});

describe('getEntityColors', () => {
  it('assigns palette hues in schema order and skips assets', () => {
    const colors = getEntityColors(schema, 'light');

    assert.equal(colors.product, GRAPH_PALETTE.light[0]);
    assert.equal(colors.brand, GRAPH_PALETTE.light[1]);
    assert.equal(colors.country, GRAPH_PALETTE.light[2]);
    assert.equal(colors._asset, undefined);
  });

  it('steps the same hues for the dark surface', () => {
    assert.equal(getEntityColors(schema, 'dark').product, GRAPH_PALETTE.dark[0]);
  });
});
