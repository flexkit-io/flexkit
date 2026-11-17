import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SchemaErrorHolders } from '../src/graphql-client/schema-error-holders';
import { canChangeSchema, parseSchemaErrorMessage, schemaErrorPrompt } from '../src/core/error/schema-error-prompt';

describe('SchemaErrorHolders', () => {
  it('keeps a message while a failing query holds it', () => {
    const holders = new SchemaErrorHolders();
    const failing = Symbol('failing');
    const succeeding = Symbol('succeeding');

    holders.hold(failing, 'broken');
    holders.release(succeeding);

    // The query that succeeds must not clear what the failing one raised (React error #185 loop).
    assert.equal(holders.afterRelease('broken'), 'broken');

    holders.release(failing);
    assert.equal(holders.afterRelease('broken'), null);
  });

  it('clears a message nobody holds once no query fails', () => {
    const holders = new SchemaErrorHolders();

    assert.equal(holders.afterRelease('from a mutation'), null);
    assert.equal(holders.afterRelease(null), null);
  });

  it('shows what another failing query holds when the message on screen is no longer held', () => {
    const holders = new SchemaErrorHolders();
    const desk = Symbol('desk');
    const assets = Symbol('assets');

    holders.hold(desk, 'desk error');
    holders.hold(assets, 'assets error');
    holders.release(assets);

    assert.equal(holders.afterRelease('assets error'), 'desk error');
    // A failed mutation's message on screen does not hide a query that still fails.
    assert.equal(holders.afterRelease('from a mutation'), 'desk error');
  });
});

describe('schema error prompt', () => {
  const message = [
    'Some fields of the project schema do not match what the project API accepts.',
    'If the schema just changed, reload the page. If the error stays, the schema itself needs fixing.',
    '- Field "imagenPortada" of type "[_asset!]!" must have a selection of subfields.',
  ].join('\n');

  it('splits the banner message', () => {
    assert.deepEqual(parseSchemaErrorMessage(message), {
      summary: 'Some fields of the project schema do not match what the project API accepts.',
      hint: 'If the schema just changed, reload the page. If the error stays, the schema itself needs fixing.',
      details: ['Field "imagenPortada" of type "[_asset!]!" must have a selection of subfields.'],
    });
    assert.deepEqual(parseSchemaErrorMessage('Only a summary'), { summary: 'Only a summary', hint: null, details: [] });
  });

  it('quotes the errors and the page for the agent', () => {
    const prompt = schemaErrorPrompt({ details: parseSchemaErrorMessage(message).details, pagePath: '/desk/blogs' });

    assert.match(prompt, /on \/desk\/blogs/);
    assert.match(prompt, /- Field "imagenPortada" of type "\[_asset!\]!" must have a selection of subfields\./);
    assert.match(prompt, /propose a schema change/);
  });

  it('offers the agent only to roles that may change the schema', () => {
    assert.equal(canChangeSchema('owner'), true);
    assert.equal(canChangeSchema('developer'), true);
    assert.equal(canChangeSchema('editor'), false);
    assert.equal(canChangeSchema(undefined), false);
  });
});
