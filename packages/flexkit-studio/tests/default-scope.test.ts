import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Entity } from '../src/core/types';
import { defaultScopeName } from '../src/core/default-scope';
import {
  getEntityCreateMutation,
  getEntityQuery,
  mapQueryResult,
  mapQueryResultForFormFields,
} from '../src/graphql-client/queries';

const product: Entity = {
  name: 'product',
  plural: 'products',
  display: 'title',
  attributes: [
    { name: 'sku', label: 'SKU', scope: 'global', dataType: 'string', inputType: 'text' },
    { name: 'title', label: 'Title', scope: 'local', dataType: 'string', inputType: 'text' },
  ],
};
const schema = [product];

describe('default scope', () => {
  it('is the scope marked isDefault, whatever its name', () => {
    assert.equal(defaultScopeName([{ name: 'uk' }, { name: 'eu', isDefault: true }]), 'eu');
    assert.equal(defaultScopeName([{ name: 'uk' }, { name: 'us' }]), 'uk');
    assert.equal(defaultScopeName(undefined), 'default');
  });

  it('selects the default value under `default` through an alias when the default scope has another name', () => {
    const inDefault = getEntityQuery('products', 'eu', schema, { defaultScope: 'eu', includeCount: false }).query;

    assert.match(inDefault, /title \{\s*_id\s*default: eu\s*\}/);

    const inOther = getEntityQuery('products', 'uk', schema, { defaultScope: 'eu', includeCount: false }).query;

    assert.match(inOther, /title \{\s*_id\s*default: eu\s*uk\s*\}/);
  });

  it('keeps the plain `default` field for projects whose default scope is named so', () => {
    const { query } = getEntityQuery('products', 'default', schema, { includeCount: false });

    assert.match(query, /title \{\s*_id\s*default\s*\}/);
    assert.doesNotMatch(query, /default:/);
  });

  it('reads the fallback from the aliased default value', () => {
    const results = {
      products: [
        {
          __typename: 'product',
          _id: 'p1',
          _updatedAt: '',
          sku: 'A1',
          title: [{ _id: 't1', default: 'Sofa', uk: null }],
        },
      ],
    };

    assert.equal(mapQueryResult('products', 'uk', results, schema).results[0]?.title, 'Sofa');
  });

  it('does not offer "use default value" for fields in the default scope', () => {
    const results = {
      products: [{ __typename: 'product', _id: 'p1', sku: 'A1', title: [{ _id: 't1', default: 'Sofa', eu: null }] }],
    };
    const [record] = mapQueryResultForFormFields('products', 'eu', results, schema, 'eu').results;

    assert.equal(record?.title?.disabled, false);
    assert.equal(record?.title?.value, 'Sofa');
  });

  it('creates new records in the default scope', () => {
    const mutation = getEntityCreateMutation(
      'products',
      schema,
      {
        sku: { value: 'A1', disabled: false, scope: 'eu' },
        title: { value: 'Sofa', disabled: false, scope: 'eu' },
      },
      'p1',
      { defaultScope: 'eu' }
    );

    assert.match(mutation, /eu: "Sofa"/);
    assert.doesNotMatch(mutation, /\bdefault: "Sofa"/);
  });
});
