import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCountQuery,
  buildCreateInput,
  buildDeleteMutation,
  buildDeleteVariables,
  buildListQuery,
  buildUpdateInput,
  coerceScalar,
  formatCellValue,
  getAllFields,
  getDefaultListFields,
  getUpdateReadFields,
  mergeRecordData,
  normalizeRecord,
  parseFields,
  parseSort,
  toIdList,
} from '../src/commands/records/operations';
import {
  findEntity,
  requireEntity,
  resolveScope,
  toRecordSchema,
  type RecordEntity,
} from '../src/commands/records/schema';

const product: RecordEntity = {
  name: 'product',
  plural: 'products',
  display: 'name',
  attributes: [
    { name: 'sku', dataType: 'string', scope: 'global' },
    { name: 'name', dataType: 'string', scope: 'local' },
    { name: 'price', dataType: 'float', scope: 'global' },
    { name: 'stock', dataType: 'int', scope: 'global', hidden: true },
    { name: 'status', dataType: 'string', scope: 'global' },
    { name: 'active', dataType: 'boolean', scope: 'global' },
    {
      name: 'brand',
      dataType: 'string',
      scope: 'relationship',
      inputType: 'relationship',
      relationship: { entity: 'brand', mode: 'single', field: 'name' },
    },
    {
      name: 'categories',
      dataType: 'string',
      scope: 'relationship',
      inputType: 'relationship',
      relationship: { entity: 'category', mode: 'multiple', field: 'name' },
    },
    {
      name: 'gallery',
      dataType: 'string',
      scope: 'relationship',
      inputType: 'relationship',
      relationship: { entity: '_asset', mode: 'multiple', field: '_id' },
    },
    { name: 'image', dataType: 'asset', scope: 'global' },
  ],
};

const brand: RecordEntity = {
  name: 'brand',
  plural: 'brands',
  attributes: [{ name: 'title', dataType: 'string', scope: 'global' }],
};

const schema = toRecordSchema(
  [product, brand, { name: '_asset', plural: '_assets', attributes: [] }],
  [{ name: 'default', isDefault: true }, { name: 'de' }]
);

describe('records schema', () => {
  it('drops reserved entities and reads scopes', () => {
    assert.deepEqual(
      schema.entities.map((entity) => entity.name),
      ['product', 'brand']
    );
    assert.deepEqual(schema.scopeNames, ['default', 'de']);
    assert.equal(schema.defaultScope, 'default');
    assert.deepEqual(toRecordSchema([], []).scopeNames, ['default']);
    assert.equal(toRecordSchema([], [{ name: 'en' }, { name: 'de', isDefault: true }]).defaultScope, 'de');
  });

  it('finds entities by name or plural', () => {
    assert.equal(findEntity(schema, 'product'), product);
    assert.equal(findEntity(schema, 'products'), product);
    assert.equal(findEntity(schema, 'Products'), product);
    assert.throws(() => requireEntity(schema, 'orders'), /Unknown entity "orders".*products, brands/);
  });

  it('validates scopes', () => {
    assert.equal(resolveScope(schema, undefined), 'default');
    assert.equal(resolveScope(schema, 'de'), 'de');
    assert.throws(() => resolveScope(schema, 'fr'), /Unknown scope "fr"/);
  });
});

describe('records fields and sort', () => {
  it('picks default list columns: _id, display attribute, visible scalars, _updatedAt', () => {
    assert.deepEqual(
      getDefaultListFields(product).map((field) => field.name),
      ['_id', 'name', 'sku', 'price', 'status', '_updatedAt']
    );
  });

  it('parses --fields and always includes _id', () => {
    assert.deepEqual(
      parseFields(product, 'sku, brand,_createdAt,sku').map((field) => [field.name, field.kind]),
      [
        ['_id', 'system'],
        ['sku', 'global'],
        ['brand', 'ref-single'],
        ['_createdAt', 'system'],
      ]
    );
    assert.throws(() => parseFields(product, 'colour'), /Unknown field "colour"/);
  });

  it('parses --sort and rejects non-sortable fields', () => {
    assert.deepEqual(parseSort(product, 'price:desc,_createdAt'), [{ price: 'DESC' }, { _createdAt: 'ASC' }]);
    assert.throws(() => parseSort(product, 'name'), /only global attributes/);
    assert.throws(() => parseSort(product, 'price:down'), /Invalid sort direction/);
    assert.throws(() => parseSort(product, 'nope'), /Unknown sort field/);
  });
});

describe('records operations', () => {
  it('builds the list query with typed variables and nested selections', () => {
    const query = buildListQuery(product, getAllFields(product), schema.scopeNames);

    assert.match(
      query,
      /query ListProducts\(\$where: productWhere, \$limit: Int, \$offset: Int, \$sort: \[productSort!\]\)/
    );
    assert.match(query, /products\(where: \$where, limit: \$limit, offset: \$offset, sort: \$sort\)/);
    assert.match(query, /name \{ _id default de \}/);
    assert.match(query, /brand\(limit: 1\) \{ _id \}/);
    assert.match(query, /categories\(limit: 100\) \{ _id \}/);
    assert.match(query, /galleryConnection \{ edges \{ properties \{ sortOrder \} node \{ _id url \} \} \}/);
    assert.match(query, /image \{ _id url \}/);
  });

  it('builds the count query on the Connection field', () => {
    assert.equal(
      buildCountQuery(product),
      'query CountProducts($where: productWhere) {\n  productsConnection(where: $where) {\n    totalCount\n  }\n}'
    );
  });

  it('deletes scoped value nodes with the records', () => {
    assert.match(buildDeleteMutation(product), /deleteProducts\(where: \$where, delete: \$delete\)/);
    assert.deepEqual(buildDeleteVariables(product, ['p1', 'p2']), {
      where: { _id: { in: ['p1', 'p2'] } },
      delete: { name: [{ where: { node: { _id: { in: ['p1:name', 'p2:name'] } } } }] },
    });
    assert.doesNotMatch(buildDeleteMutation(brand), /\$delete/);
    assert.deepEqual(buildDeleteVariables(brand, ['b1']), { where: { _id: { in: ['b1'] } } });
  });

  it('normalizes scoped values, relationships and assets', () => {
    const fields = getAllFields(product);
    const raw = {
      _id: 'p1',
      sku: 'BAG-001',
      name: [{ _id: 'p1:name', default: 'Bag', de: 'Tasche' }],
      brand: [{ _id: 'b1' }],
      categories: [{ _id: 'c1' }, { _id: 'c2' }],
      galleryConnection: {
        edges: [
          { properties: { sortOrder: 1 }, node: { _id: 'a2', url: 'https://x/a2.jpg' } },
          { properties: { sortOrder: 0 }, node: { _id: 'a1', url: 'https://x/a1.jpg' } },
        ],
      },
      image: [],
    };
    const all = normalizeRecord(raw, fields);

    assert.deepEqual(all.name, { default: 'Bag', de: 'Tasche' });
    assert.equal(all.brand, 'b1');
    assert.deepEqual(all.categories, ['c1', 'c2']);
    assert.deepEqual(
      (all.gallery as { _id: string }[]).map((asset) => asset._id),
      ['a1', 'a2']
    );
    assert.equal(all.image, null);
    assert.equal(all.price, null);
    assert.equal(normalizeRecord(raw, fields, 'de').name, 'Tasche');
  });

  it('builds a create input', () => {
    const input = buildCreateInput(
      product,
      {
        sku: 123,
        price: '49.5',
        name: { default: 'Bag', de: 'Tasche' },
        brand: 'b1',
        categories: ['c1', 'c2'],
        gallery: ['a1', 'a2'],
        status: null,
      },
      schema,
      'default',
      'p1'
    );

    assert.deepEqual(input, {
      _id: 'p1',
      sku: '123',
      price: 49.5,
      name: { create: [{ node: { _id: 'p1:name', _type: 'string', default: 'Bag', de: 'Tasche' } }] },
      brand: { connect: [{ where: { node: { _id: { in: ['b1'] } } } }] },
      categories: { connect: [{ where: { node: { _id: { in: ['c1', 'c2'] } } } }] },
      gallery: {
        connect: [
          { where: { node: { _id: { eq: 'a1' } } }, edge: { sortOrder: 0 } },
          { where: { node: { _id: { eq: 'a2' } } }, edge: { sortOrder: 1 } },
        ],
      },
    });
  });

  it('writes a plain value of a scoped attribute to the chosen scope', () => {
    assert.deepEqual(buildCreateInput(product, { name: 'Tasche' }, schema, 'de', 'p1').name, {
      create: [{ node: { _id: 'p1:name', _type: 'string', de: 'Tasche' } }],
    });
  });

  it('rejects unknown, system and invalid values', () => {
    assert.throws(
      () => buildCreateInput(product, { colour: 'red' }, schema, 'default', 'p1'),
      /Unknown attribute "colour"/
    );
    assert.throws(() => buildCreateInput(product, { _createdAt: 'x' }, schema, 'default', 'p1'), /set by Flexkit/);
    assert.throws(() => buildCreateInput(product, { brand: ['b1', 'b2'] }, schema, 'default', 'p1'), /single record/);
    assert.throws(
      () => buildCreateInput(product, { name: { fr: 'Sac' } }, schema, 'default', 'p1'),
      /scoped attribute/
    );
    assert.throws(() => buildCreateInput(product, { categories: [1] }, schema, 'default', 'p1'), /record id/);
  });

  it('builds an update input from the current record', () => {
    const data = {
      price: 39,
      status: null,
      name: 'Tasche',
      brand: 'b2',
      categories: ['c2', 'c3'],
      gallery: [{ _id: 'a2' }, 'a3'],
    };

    assert.deepEqual(
      getUpdateReadFields(product, data).map((field) => field.name),
      ['_id', 'price', 'status', 'name', 'brand', 'categories', 'gallery']
    );

    const current = {
      _id: 'p1',
      name: [{ _id: 'p1:name', default: 'Bag' }],
      brand: [{ _id: 'b1' }],
      categories: [{ _id: 'c1' }, { _id: 'c2' }],
      galleryConnection: {
        edges: [
          { properties: { sortOrder: 0 }, node: { _id: 'a1' } },
          { properties: { sortOrder: 1 }, node: { _id: 'a2' } },
        ],
      },
    };

    assert.deepEqual(buildUpdateInput(product, data, schema, 'de', current), {
      price: { set: 39 },
      status: { set: null },
      name: [{ update: { node: { de: { set: 'Tasche' } } } }],
      brand: [
        { disconnect: [{ where: { node: { _id: { in: ['b1'] } } } }] },
        { connect: [{ where: { node: { _id: { in: ['b2'] } } } }] },
      ],
      categories: [
        { disconnect: [{ where: { node: { _id: { in: ['c1'] } } } }] },
        { connect: [{ where: { node: { _id: { in: ['c3'] } } } }] },
      ],
      gallery: [
        { disconnect: [{ where: { node: { _id: { in: ['a1'] } } } }] },
        { update: { where: { node: { _id: { eq: 'a2' } } }, edge: { sortOrder: { set: 0 } } } },
        { connect: [{ where: { node: { _id: { eq: 'a3' } } }, edge: { sortOrder: 1 } }] },
      ],
    });
  });

  it('creates a missing scoped node on update and clears relationships with null', () => {
    const current = { _id: 'p1', name: [], brand: [{ _id: 'b1' }] };

    assert.deepEqual(buildUpdateInput(product, { name: 'Bag', brand: null }, schema, 'default', current), {
      name: [{ create: { node: { _id: 'p1:name', _type: 'string', default: 'Bag' } } }],
      brand: [{ disconnect: [{ where: { node: { _id: { in: ['b1'] } } } }] }],
    });
    assert.throws(() => buildUpdateInput(product, { _id: 'p2' }, schema, 'default', current), /cannot be changed/);
  });
});

describe('records values', () => {
  it('coerces scalars to the attribute type', () => {
    assert.equal(coerceScalar('string', 7), '7');
    assert.equal(coerceScalar('int', '42'), 42);
    assert.equal(coerceScalar('float', 'abc'), 'abc');
    assert.equal(coerceScalar('boolean', 'false'), false);
    assert.equal(coerceScalar('string', null), null);
  });

  it('reads id lists', () => {
    assert.deepEqual(toIdList('b1', 'brand'), ['b1']);
    assert.deepEqual(toIdList([{ _id: 'a1' }, 'a2'], 'gallery'), ['a1', 'a2']);
    assert.deepEqual(toIdList(null, 'brand'), []);
  });

  it('merges --set into --data per scope', () => {
    assert.deepEqual(mergeRecordData({ name: { default: 'Bag' }, sku: 'A' }, { name: { de: 'Tasche' }, sku: 'B' }), {
      name: { default: 'Bag', de: 'Tasche' },
      sku: 'B',
    });
  });

  it('formats table cells', () => {
    assert.equal(formatCellValue(null), '');
    assert.equal(formatCellValue(['c1', 'c2']), 'c1, c2');
    assert.equal(formatCellValue({ _id: 'a1', url: 'https://x/a1.jpg' }), 'https://x/a1.jpg');
    assert.equal(formatCellValue({ default: 'Bag', de: null }), 'default: Bag');
    assert.equal(formatCellValue(false), 'false');
  });
});

describe('rich text cells', () => {
  it('shows the text of a rich text document, stored or parsed', async () => {
    const { formatCellValue } = await import('../src/commands/records/operations');
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Gentle ' }, { type: 'text', text: 'shampoo.' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Daily use.' }] },
      ],
    };

    assert.equal(formatCellValue(doc), 'Gentle shampoo.\nDaily use.');
    assert.equal(formatCellValue(JSON.stringify(doc)), 'Gentle shampoo.\nDaily use.');
    assert.equal(formatCellValue('{"type":"doc"'), '{"type":"doc"');
  });
});
