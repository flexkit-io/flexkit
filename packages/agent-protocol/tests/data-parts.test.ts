import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DATA_PART_TYPES, dataPartSchema, isDataPartType } from '../src/data-parts';

describe('dataPartSchema', () => {
  it('lists every part type once', () => {
    assert.ok(DATA_PART_TYPES.includes('mutation-approval'));
    assert.ok(DATA_PART_TYPES.includes('turn-error'));
    assert.equal(new Set(DATA_PART_TYPES).size, DATA_PART_TYPES.length);
    assert.equal(isDataPartType('plugin-call'), true);
    assert.equal(isDataPartType('nope'), false);
  });

  it('validates representative parts and rejects malformed ones', () => {
    assert.ok(dataPartSchema.shape['plugin-call'].safeParse({ pluginId: 'gmail', status: 'loading', tool: 't' }).success);
    assert.ok(
      dataPartSchema.shape.plan.safeParse({ steps: [{ status: 'in_progress', step: 'Fetch' }], updatedAt: 'now' }).success
    );
    assert.equal(dataPartSchema.shape['plugin-call'].safeParse({ pluginId: 'gmail', status: 'nope' }).success, false);
    assert.equal(dataPartSchema.shape['run-summary'].safeParse({ status: 'success' }).success, false);
  });
});
