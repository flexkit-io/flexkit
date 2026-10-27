import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Entity } from '../../src/core/types';
import {
  buildCountsQuery,
  buildDetailsQuery,
  buildExpandQuery,
  buildRecordsQuery,
  buildTotalsQuery,
  captionOf,
  edgeOf,
  EXPAND_PAGE,
  fetchedFromRecords,
  formatDetailValue,
  getDetailAttributes,
  getDisplaySelection,
  getEntityColors,
  getGraphEntities,
  getRelationshipAttributes,
  graphFromRecords,
  graphPath,
  GRAPH_PALETTE,
  nodeKey,
  parseGraphParams,
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
    { name: 'secret', label: 'Secret', dataType: 'string', inputType: 'text', scope: 'global', hidden: true },
    { name: 'body', label: 'Body', dataType: 'string', inputType: 'editor', scope: 'local' },
    { name: 'photo', label: 'Photo', dataType: 'asset', inputType: 'asset' },
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
  spaces: ['eu'],
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
    assert.equal(getDisplaySelection(product, 'en'), 'name { default en }');
    assert.equal(getDisplaySelection(product, 'default'), 'name { default }');
  });

  it('falls back to nothing without an entity', () => {
    assert.equal(getDisplaySelection(undefined, 'en'), '');
  });
});

describe('queries', () => {
  it('fetches records with a page of each drawable relationship when expanding', () => {
    const query = buildRecordsQuery({ entity: product, schema, scope: 'en', expand: true });

    assert.match(query, /query GraphRecords\(\$where: productWhere, \$limit: Int\)/);
    assert.match(query, /products\(where: \$where, limit: \$limit\)/);
    assert.match(query, /name \{ default en \}/);
    assert.match(query, new RegExp(`brand\\(limit: ${EXPAND_PAGE}\\) \\{ _id title \\}`));
    assert.doesNotMatch(query, /Connection/);
    assert.doesNotMatch(query, /images/);
  });

  it('fetches only the records themselves otherwise', () => {
    const query = buildRecordsQuery({ entity: product, schema, scope: 'en', expand: false });

    assert.match(query, /name \{ default en \}/);
    assert.doesNotMatch(query, /brand/);
  });

  it('pages one relationship of one record', () => {
    const [attribute] = getRelationshipAttributes(product);
    const query = buildExpandQuery({ entity: product, schema, scope: 'en', attribute: attribute! });

    assert.match(query, /\$id: ID!, \$offset: Int, \$limit: Int/);
    assert.match(query, /products\(where: \{ _id: \{ eq: \$id \} \}\)/);
    assert.match(query, /brand\(limit: \$limit, offset: \$offset\) \{ _id title \}/);
  });

  it('counts every drawable relationship of one record', () => {
    const query = buildCountsQuery({ entity: product });

    assert.match(query, /brandConnection \{ aggregate \{ count \{ nodes \} \} \}/);
    assert.doesNotMatch(query, /imagesConnection/);
  });

  it('details visible scalars, local ones in the scope', () => {
    assert.deepEqual(
      getDetailAttributes(product).map((attribute) => attribute.name),
      ['sku', 'name']
    );
    const query = buildDetailsQuery({ entity: product, scope: 'en' });

    assert.match(query, /_updatedAt/);
    assert.match(query, /sku\n/);
    assert.match(query, /name \{ default en \}/);
    assert.doesNotMatch(query, /secret|photo|brand|body/);
  });

  it('asks totals only for entities without spaces', () => {
    const query = buildTotalsQuery([product, brand, country]);

    assert.match(query, /productsTotal/);
    assert.match(query, /brandsTotal/);
    assert.doesNotMatch(query, /countriesTotal/);
  });
});

describe('captionOf', () => {
  it('reads a global display value', () => {
    assert.equal(captionOf({ _id: 'b1', title: 'Fjell' }, brand, 'en'), 'Fjell');
  });

  it('reads the scope value of a local display attribute', () => {
    assert.equal(captionOf({ _id: 'p1', name: [{ en: 'Parka', de: 'Parka DE' }] }, product, 'en'), 'Parka');
  });

  it('falls back to the default scope, then the id', () => {
    assert.equal(captionOf({ _id: 'p1', name: [{ en: null, default: 'Parka' }] }, product, 'en'), 'Parka');
    assert.equal(formatDetailValue([{ en: null, default: 'Parka' }], 'en'), 'Parka');
  });

  it('falls back to the id when the value is missing', () => {
    assert.equal(captionOf({ _id: 'p1', name: [] }, product, 'en'), 'p1');
    assert.equal(captionOf({ _id: 'c1' }, undefined, 'en'), 'c1');
  });
});

describe('formatDetailValue', () => {
  it('formats scalars, scoped lists and empties', () => {
    assert.equal(formatDetailValue('x', 'en'), 'x');
    assert.equal(formatDetailValue(3, 'en'), '3');
    assert.equal(formatDetailValue([{ en: 'Parka' }], 'en'), 'Parka');
    assert.equal(formatDetailValue([], 'en'), '');
    assert.equal(formatDetailValue(null, 'en'), '');
    assert.equal(formatDetailValue({ a: 1 }, 'en'), '{"a":1}');
  });
});

describe('edges', () => {
  it('keys the edge by the sorted pair and the attribute on the first node', () => {
    const [brandAttribute] = getRelationshipAttributes(product);
    const [productsAttribute] = getRelationshipAttributes(brand);
    const p1 = { key: 'product:p1', entity: 'product', id: 'p1', label: 'Parka' };
    const b1 = { key: 'brand:b1', entity: 'brand', id: 'b1', label: 'Fjell' };
    const fromProduct = edgeOf(p1, b1, brandAttribute!);
    const fromBrand = edgeOf(b1, p1, productsAttribute!);

    assert.equal(fromProduct.key, 'brand:b1|product:p1|products');
    assert.equal(fromProduct.key, fromBrand.key);
    assert.deepEqual([fromProduct.sourceAttribute, fromProduct.targetAttribute], ['brand', 'products']);
    assert.deepEqual([fromBrand.sourceAttribute, fromBrand.targetAttribute], ['products', 'brand']);
  });
});

describe('graphFromRecords', () => {
  it('turns records and their related records into deduplicated nodes, edges and counts', () => {
    const records = [
      {
        _id: 'p1',
        name: [{ en: 'Parka' }],
        brand: [{ _id: 'b1', title: 'Fjell' }],
        brandConnection: { aggregate: { count: { nodes: 1 } } },
      },
      { _id: 'p2', name: [{ en: 'Vest' }], brand: [{ _id: 'b1', title: 'Fjell' }] },
      { _id: 'p3', name: [{ en: 'Shell' }], brand: [] },
    ];
    const { nodes, edges, counts } = graphFromRecords({ records, entity: product, schema, scope: 'en' });

    assert.deepEqual(
      nodes.map((node) => node.key),
      [nodeKey('product', 'p1'), nodeKey('brand', 'b1'), nodeKey('product', 'p2'), nodeKey('product', 'p3')]
    );
    assert.equal(nodes[1]?.label, 'Fjell');
    assert.deepEqual(
      edges.map((edge) => [edge.source, edge.target, edge.sourceAttribute]),
      [
        ['product:p1', 'brand:b1', 'brand'],
        ['product:p2', 'brand:b1', 'brand'],
      ]
    );
    assert.deepEqual(counts, { 'product:p1': { brand: 1 } });
  });

  it('keeps one edge per pair whichever side it was fetched from', () => {
    const records = [{ _id: 'b1', title: 'Fjell', products: [{ _id: 'p1', name: [{ en: 'Parka' }] }] }];
    const { edges } = graphFromRecords({ records, entity: brand, schema, scope: 'en' });

    assert.deepEqual(
      edges.map((edge) => edge.key),
      ['brand:b1|product:p1|products']
    );
  });

  it('reports how many related records came back per relationship', () => {
    const records = [
      { _id: 'p1', brand: [{ _id: 'b1' }] },
      { _id: 'p2', brand: [] },
      { _id: 'p3' },
    ];

    assert.deepEqual(fetchedFromRecords(records, product), { 'product:p1': { brand: 1 }, 'product:p2': { brand: 0 } });
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

  it('holds twelve distinct hues per surface', () => {
    assert.equal(GRAPH_PALETTE.light.length, 12);
    assert.equal(GRAPH_PALETTE.dark.length, 12);
    assert.equal(new Set(GRAPH_PALETTE.light).size, 12);
    assert.equal(new Set(GRAPH_PALETTE.dark).size, 12);
  });
});

describe('routes', () => {
  it('builds and parses the app route', () => {
    assert.equal(graphPath('abc', { entity: 'product' }), '/abc/graph?entity=product');
    assert.equal(graphPath('abc', { entity: 'product', ids: ['1', '2'] }), '/abc/graph?entity=product&ids=1%2C2');
    assert.deepEqual(parseGraphParams('?entity=product&ids=1%2C2'), { entity: 'product', ids: ['1', '2'] });
    assert.deepEqual(parseGraphParams('?entity=product'), { entity: 'product', ids: [] });
    assert.equal(parseGraphParams(''), null);
  });
});
