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

  it('validates user questions and their answers', () => {
    const question = {
      header: 'Format',
      multiSelect: false,
      options: [
        { description: 'Opens in Excel', label: 'CSV' },
        { description: 'Keeps nesting', label: 'JSON' },
      ],
      question: 'Which export format?',
    };
    const schema = dataPartSchema.shape['user-question'];

    assert.ok(schema.safeParse({ questionId: 'q1', questions: [question], status: 'pending' }).success);
    assert.ok(
      schema.safeParse({
        answers: [{ other: 'Both, please', selected: ['CSV'] }],
        questionId: 'q1',
        questions: [question],
        status: 'answered',
      }).success
    );
    assert.equal(schema.safeParse({ questionId: 'q1', questions: [question], status: 'approved' }).success, false);
  });

  it('validates export progress and data artifacts', () => {
    assert.ok(
      dataPartSchema.shape['export-records'].safeParse({ filename: 'products.csv', format: 'csv', rowCount: 1200, status: 'loading' })
        .success
    );
    assert.equal(
      dataPartSchema.shape['export-records'].safeParse({ filename: 'products.xml', format: 'xml', rowCount: 0, status: 'done' }).success,
      false
    );
    assert.ok(dataPartSchema.shape['run-artifact'].safeParse({ filename: 'products.csv', kind: 'csv', status: 'done' }).success);
  });

  it('validates the plugin-connected notice', () => {
    const schema = dataPartSchema.shape['plugin-connected'];

    assert.ok(schema.safeParse({ accountName: 'dan@acme.com', pluginId: 'notion', pluginName: 'Notion', scope: 'personal' }).success);
    assert.equal(schema.safeParse({ pluginId: 'notion', pluginName: 'Notion', scope: 'team' }).success, false);
  });
});
