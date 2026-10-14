import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toHostedSession } from '../src/core/config/use-hosted-session';
import { toProjectSchemaState } from '../src/core/config/use-project-schemas';

describe('hosted session state', () => {
  it('maps fetch outcomes to boot states', () => {
    assert.deepEqual(toHostedSession(undefined), { status: 'loading' });
    assert.deepEqual(toHostedSession({ kind: 'anonymous' }), { status: 'anonymous' });
    assert.deepEqual(toHostedSession({ kind: 'error', message: 'down' }), { status: 'error', message: 'down' });

    const data = { user: { id: 'u', email: 'a@b.io', displayName: null, avatarUrl: null }, projects: [] };
    assert.deepEqual(toHostedSession({ kind: 'ready', data }), { status: 'ready', user: data.user, projects: [] });
  });

  it('wraps a single schema outcome in the shared state shape', () => {
    assert.deepEqual(toProjectSchemaState(undefined, true), { projects: [], errors: {}, isLoading: true });
    assert.deepEqual(
      toProjectSchemaState({ ok: false, projectId: 'p', error: { status: 404, message: 'no' } }, false),
      { projects: [], errors: { p: { status: 404, message: 'no' } }, isLoading: false }
    );
  });
});
