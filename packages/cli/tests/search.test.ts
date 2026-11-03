import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toRecordSchema, type RecordEntity } from '../src/commands/records/schema';
import { buildSearchRequest, flattenSearchResults, selectSearchEntities } from '../src/commands/search/results';

const product: RecordEntity = {
  name: 'product',
  plural: 'products',
  display: 'name',
  attributes: [
    { name: 'sku', dataType: 'string', scope: 'global' },
    { name: 'name', dataType: 'string', scope: 'local' },
  ],
};
const brand: RecordEntity = {
  name: 'brand',
  plural: 'brands',
  attributes: [{ name: 'title', dataType: 'string', scope: 'global' }],
};
const schema = toRecordSchema([product, brand], [{ name: 'default' }, { name: 'de' }]);

describe('search', () => {
  it('selects every entity or the named ones', () => {
    assert.deepEqual(selectSearchEntities(schema, undefined), [product, brand]);
    assert.deepEqual(selectSearchEntities(schema, ['brands', 'product,brand']), [brand, product]);
    assert.throws(() => selectSearchEntities(schema, ['orders']), /Unknown entity "orders"/);
  });

  it('builds the /search body with one search per plural', () => {
    assert.deepEqual(buildSearchRequest([product, brand], 'canvas bag', 10), {
      searchRequests: { searches: [{ collection: 'products' }, { collection: 'brands' }] },
      commonParams: { q: 'canvas bag', limit: 10 },
    });
  });

  it('flattens results by request order, ranks by score and cuts to the limit', () => {
    const hits = flattenSearchResults(
      [product, brand],
      {
        results: [
          {
            collection: 'abc_products',
            hits: [
              { document: { _id: 'p1', name: { default: 'Bag', de: 'Tasche' } }, score: 2.5 },
              { document: { _id: 'p2', name: { de: 'Nur Deutsch' } }, score: 0.5 },
              { document: {}, score: 9 },
            ],
          },
          { collection: 'abc_brands', hits: [{ document: { _id: 'b1', title: 'Acme' }, score: 3 }] },
        ],
      },
      'default',
      2
    );

    assert.deepEqual(
      hits.map((hit) => [hit.entity, hit._id, hit.label, hit.score]),
      [
        ['brand', 'b1', 'Acme', 3],
        ['product', 'p1', 'Bag', 2.5],
      ]
    );

    const fallback = flattenSearchResults(
      [product],
      { results: [{ hits: [{ document: { _id: 'p2', name: { de: 'Nur Deutsch' } }, score: '1' }] }] },
      'default',
      5
    );

    assert.equal(fallback[0]?.label, 'Nur Deutsch');
    assert.equal(fallback[0]?.score, 1);
  });
});
