import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { classifyBadRequest, getRoleRefusalMessage } from '../src/graphql-client/role-refusal';

const DELETE_SENTENCE = 'Your role (Contributor) cannot delete records. Ask a project owner for the Editor role.';
const FILTER_SENTENCE = 'You cannot filter by "margin": it belongs to a space you are not a member of.';
const SCHEMA_FALLBACK =
  'A request to the project did not match its schema. Reload the page, and contact support if it keeps happening.';

function body(code: string | undefined, message: unknown): string {
  return JSON.stringify({ errors: [{ message, ...(code ? { extensions: { code } } : {}) }] });
}

function serverError(status: number, bodyText: string): ServerError {
  return new ServerError('Response not successful', { response: new Response(bodyText, { status }), bodyText });
}

describe('classifyBadRequest', () => {
  it('turns a refused delete into a toast with the server sentence', () => {
    assert.deepEqual(classifyBadRequest(body('FORBIDDEN_DELETE', DELETE_SENTENCE)), {
      kind: 'role-refusal',
      message: DELETE_SENTENCE,
    });
  });

  it('turns a refused filter into a toast with the server sentence', () => {
    assert.deepEqual(classifyBadRequest(body('FORBIDDEN_FILTER', FILTER_SENTENCE)), {
      kind: 'role-refusal',
      message: FILTER_SENTENCE,
    });
  });

  it('still says something when a refusal comes without a sentence', () => {
    assert.deepEqual(classifyBadRequest(body('FORBIDDEN_DELETE', undefined)), {
      kind: 'role-refusal',
      message: 'Your member role cannot perform this action.',
    });
  });

  it('only looks at the first error', () => {
    const bodyText = JSON.stringify({
      errors: [
        { message: 'Unknown argument "foo".' },
        { message: DELETE_SENTENCE, extensions: { code: 'FORBIDDEN_DELETE' } },
      ],
    });

    assert.deepEqual(classifyBadRequest(bodyText), { kind: 'schema-error', message: 'Unknown argument "foo".' });
  });

  it('keeps every other 400 on the schema banner, as before', () => {
    assert.deepEqual(classifyBadRequest(body('BAD_USER_INPUT', 'Field "sku" is not defined.')), {
      kind: 'schema-error',
      message: 'Field "sku" is not defined.',
    });
    assert.deepEqual(classifyBadRequest(body(undefined, 'Syntax Error: Unexpected Name.')), {
      kind: 'schema-error',
      message: 'Syntax Error: Unexpected Name.',
    });
    assert.deepEqual(classifyBadRequest(JSON.stringify({ message: 'Bad request' })), {
      kind: 'schema-error',
      message: 'Bad request',
    });
    assert.deepEqual(classifyBadRequest(JSON.stringify({ error: 'Invalid query' })), {
      kind: 'schema-error',
      message: 'Invalid query',
    });
    assert.deepEqual(classifyBadRequest(JSON.stringify({ code: 'X' })), {
      kind: 'schema-error',
      message: '{"code":"X"}',
    });
    assert.deepEqual(classifyBadRequest('not json'), { kind: 'schema-error', message: 'not json' });
  });

  it('does not treat a code outside extensions, or a similar code, as a refusal', () => {
    const topLevelCode = JSON.stringify({ code: 'FORBIDDEN_DELETE', message: 'nope' });

    assert.equal(classifyBadRequest(topLevelCode).kind, 'schema-error');
    assert.equal(classifyBadRequest(body('FORBIDDEN', 'nope')).kind, 'schema-error');
    assert.equal(classifyBadRequest(body('forbidden_delete', 'nope')).kind, 'schema-error');
  });

  it('falls back to a full sentence for an empty body', () => {
    assert.deepEqual(classifyBadRequest(''), { kind: 'schema-error', message: SCHEMA_FALLBACK });
    assert.deepEqual(classifyBadRequest(undefined), { kind: 'schema-error', message: SCHEMA_FALLBACK });
    assert.deepEqual(classifyBadRequest(JSON.stringify({ errors: [] })), {
      kind: 'schema-error',
      message: SCHEMA_FALLBACK,
    });
  });
});

describe('getRoleRefusalMessage', () => {
  it('reads the sentence from an HTTP 400', () => {
    assert.equal(getRoleRefusalMessage(serverError(400, body('FORBIDDEN_DELETE', DELETE_SENTENCE))), DELETE_SENTENCE);
    assert.equal(getRoleRefusalMessage(serverError(400, body('FORBIDDEN_FILTER', FILTER_SENTENCE))), FILTER_SENTENCE);
  });

  it('reads the sentence from an error that wraps the HTTP 400', () => {
    const wrapped = Object.assign(new Error('Response not successful'), {
      cause: serverError(400, body('FORBIDDEN_DELETE', DELETE_SENTENCE)),
    });

    assert.equal(getRoleRefusalMessage(wrapped), DELETE_SENTENCE);
  });

  it('reads the sentence from parsed GraphQL errors', () => {
    const error = new CombinedGraphQLErrors({
      errors: [{ message: DELETE_SENTENCE, extensions: { code: 'FORBIDDEN_DELETE' } }],
    });

    assert.equal(getRoleRefusalMessage(error), DELETE_SENTENCE);
  });

  it('is null for anything else', () => {
    assert.equal(getRoleRefusalMessage(undefined), null);
    assert.equal(getRoleRefusalMessage(null), null);
    assert.equal(getRoleRefusalMessage(new Error('Failed to fetch')), null);
    assert.equal(getRoleRefusalMessage(serverError(400, body('BAD_USER_INPUT', 'nope'))), null);
    // The code only means a role refusal on the status the backend sends it with.
    assert.equal(getRoleRefusalMessage(serverError(500, body('FORBIDDEN_DELETE', DELETE_SENTENCE))), null);
    assert.equal(
      getRoleRefusalMessage(
        new CombinedGraphQLErrors({ errors: [{ message: 'Cannot query field "x" on type "Query".' }] })
      ),
      null
    );
  });
});
