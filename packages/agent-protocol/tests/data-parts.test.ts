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

  it('validates chat history searches and reads', () => {
    const result = { chatId: 'c1', chatTitle: 'Churn report', date: '2026-10-28', excerpt: 'Churn was 4%', messageId: 'm1' };

    assert.ok(dataPartSchema.shape['chat-search'].safeParse({ query: 'churn', status: 'loading' }).success);
    assert.ok(dataPartSchema.shape['chat-search'].safeParse({ query: 'churn', results: [result], status: 'done' }).success);
    assert.equal(
      dataPartSchema.shape['chat-search'].safeParse({ query: 'churn', results: [{ chatId: 'c1' }], status: 'done' }).success,
      false
    );
    assert.ok(dataPartSchema.shape['read-chat'].safeParse({ chatId: 'c1', chatTitle: 'Churn report', status: 'done' }).success);
    assert.equal(dataPartSchema.shape['read-chat'].safeParse({ status: 'done' }).success, false);
  });

  it('validates automation run searches and reads', () => {
    const result = {
      automationId: 'a1',
      automationName: 'Lead follow-up',
      date: '2026-11-04',
      excerpt: 'Emailed 3 leads',
      runId: 'r1',
      status: 'success',
    };

    assert.ok(dataPartSchema.shape['run-search'].safeParse({ query: 'leads', status: 'loading' }).success);
    assert.ok(dataPartSchema.shape['run-search'].safeParse({ query: 'leads', results: [result], status: 'done' }).success);
    assert.equal(
      dataPartSchema.shape['run-search'].safeParse({ query: 'leads', results: [{ runId: 'r1' }], status: 'done' }).success,
      false
    );
    assert.equal(
      dataPartSchema.shape['run-search'].safeParse({ query: 'leads', results: [{ ...result, status: 'running' }], status: 'done' })
        .success,
      false
    );
    assert.ok(dataPartSchema.shape['read-run'].safeParse({ runId: 'r1', status: 'loading' }).success);
    assert.ok(
      dataPartSchema.shape['read-run'].safeParse({ automationId: 'a1', automationName: 'Lead follow-up', runId: 'r1', status: 'done' })
        .success
    );
    assert.equal(dataPartSchema.shape['read-run'].safeParse({ status: 'done' }).success, false);
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

describe('knowledge parts', () => {
  it('validates a finished search with citations and a source read', () => {
    const citation = {
      excerpt: 'Returns are accepted within 30 days.',
      locator: { page: 3, headingPath: ['Returns', 'Window'] },
      passageId: 'v1:17',
      sourceId: 'src1',
      sourceTitle: 'Return policy',
      versionId: 'v1',
    };
    const search = dataPartSchema.shape['knowledge-search'];
    const read = dataPartSchema.shape['read-source'];

    assert.ok(search.safeParse({ query: 'returns', status: 'loading' }).success);
    assert.ok(search.safeParse({ query: 'returns', results: [citation], status: 'done' }).success);
    assert.equal(search.safeParse({ query: 'returns', status: 'nope' }).success, false);
    assert.equal(search.safeParse({ query: 'returns', results: [{ ...citation, locator: { page: 0 } }], status: 'done' }).success, false);
    assert.ok(read.safeParse({ sourceId: 'src1', status: 'loading' }).success);
    assert.ok(read.safeParse({ sourceId: 'src1', sourceTitle: 'Return policy', locator: { slide: 2 }, status: 'done' }).success);
    assert.equal(read.safeParse({ status: 'done' }).success, false);
    assert.ok(DATA_PART_TYPES.includes('knowledge-search'));
    assert.ok(DATA_PART_TYPES.includes('read-source'));
  });
});
