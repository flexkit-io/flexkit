import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { fetchProviders } from '../src/auth/login-providers';

const realFetch = globalThis.fetch;

function respondWith(body: unknown, status = 200): void {
  globalThis.fetch = async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
}

describe('fetchProviders', () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns the providers', async () => {
    respondWith({ providers: [{ name: 'github' }] });
    assert.deepEqual(await fetchProviders('/api/flexkit/-/auth/providers'), [{ name: 'github' }]);
  });

  it('treats an answer without providers as an error, never a crash later', async () => {
    respondWith({ error: 'Unauthorized' }, 401);
    await assert.rejects(fetchProviders('/x'), /unavailable \(401\)/);

    respondWith({ error: 'Something else' });
    await assert.rejects(fetchProviders('/x'), /unavailable \(200\)/);

    respondWith('<html>Bad gateway</html>', 502);
    await assert.rejects(fetchProviders('/x'), /unavailable \(502\)/);
  });
});
