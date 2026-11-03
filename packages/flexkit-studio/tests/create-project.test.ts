import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createHostedProject, newProjectPath, ownedTeams } from '../src/core/config/create-project';

const realFetch = globalThis.fetch;

function answer(status: number, body: unknown): void {
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    assert.equal(url, '/api/flexkit/-/me/projects');
    assert.equal(init?.method, 'POST');

    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('createHostedProject', () => {
  it('returns the new project id', async () => {
    answer(201, { project: { id: 'pnew000001', name: 'Aven' }, team: { id: 't', name: 'T' } });

    assert.deepEqual(await createHostedProject({ name: 'Aven' }), { ok: true, projectId: 'pnew000001' });
  });

  it('passes on the backend message and code', async () => {
    answer(403, { error: 'You can only have 2 Free projects per team.', code: 'too_many_free_projects' });

    assert.deepEqual(await createHostedProject({ name: 'Aven', teamId: 't' }), {
      ok: false,
      code: 'too_many_free_projects',
      message: 'You can only have 2 Free projects per team.',
    });
  });

  it('reports a network failure', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;

    const outcome = await createHostedProject({ name: 'Aven' });

    assert.equal(outcome.ok, false);
    assert.equal(!outcome.ok && outcome.code, 'network_error');
  });
});

describe('project creation helpers', () => {
  it('keeps only teams the user owns and opens new projects in the AI chat', () => {
    assert.deepEqual(
      ownedTeams([
        { id: 'a', name: 'A', role: 'member' },
        { id: 'b', name: 'B', role: 'owner' },
      ]),
      [{ id: 'b', name: 'B', role: 'owner' }]
    );
    assert.equal(newProjectPath('pnew000001'), '/pnew000001/ai');
  });
});
