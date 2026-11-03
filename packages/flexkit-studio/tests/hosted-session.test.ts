import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toHostedSession, withCreatedProject } from '../src/core/config/use-hosted-session';
import { toProjectSchemaState } from '../src/core/config/use-project-schemas';

describe('hosted session state', () => {
  it('maps fetch outcomes to boot states', () => {
    assert.deepEqual(toHostedSession(undefined), { status: 'loading' });
    assert.deepEqual(toHostedSession({ kind: 'anonymous' }), { status: 'anonymous' });
    assert.deepEqual(toHostedSession({ kind: 'error', message: 'down' }), { status: 'error', message: 'down' });

    const data = { user: { id: 'u', email: 'a@b.io', displayName: null, avatarUrl: null }, projects: [] };
    // Backends before Studio onboarding send no teams.
    assert.deepEqual(toHostedSession({ kind: 'ready', data }), {
      status: 'ready',
      user: data.user,
      projects: [],
      teams: [],
    });

    const teams = [{ id: 't', name: 'Acme', role: 'owner' as const }];
    assert.deepEqual(toHostedSession({ kind: 'ready', data: { ...data, teams } }), {
      status: 'ready',
      user: data.user,
      projects: [],
      teams,
    });
  });

  it('adds a just-created project and its new team to the session', () => {
    const user = { id: 'u', email: 'a@b.io', displayName: null, avatarUrl: null };
    const created = { project: { id: 'pnew000001', name: 'Aven' }, team: { id: 't', name: "Ann's projects" } };
    const next = withCreatedProject({ kind: 'ready', data: { user, projects: [], teams: [] } }, created);

    assert.deepEqual(next, {
      kind: 'ready',
      data: {
        user,
        projects: [
          {
            avatarUrl: null,
            id: 'pnew000001',
            name: 'Aven',
            readOnly: false,
            role: 'owner',
            suspended: false,
            team: { id: 't', name: "Ann's projects" },
          },
        ],
        teams: [{ id: 't', name: "Ann's projects", role: 'owner' }],
      },
    });
    // Idempotent, and a session that is not ready stays as it is.
    assert.deepEqual(withCreatedProject(next, created), next);
    assert.deepEqual(withCreatedProject({ kind: 'anonymous' }, created), { kind: 'anonymous' });
  });

  it('wraps a single schema outcome in the shared state shape', () => {
    assert.deepEqual(toProjectSchemaState(undefined, true), { projects: [], errors: {}, isLoading: true });
    assert.deepEqual(
      toProjectSchemaState({ ok: false, projectId: 'p', error: { status: 404, message: 'no' } }, false),
      { projects: [], errors: { p: { status: 404, message: 'no' } }, isLoading: false }
    );
  });
});
