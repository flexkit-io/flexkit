import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveProxyTarget } from '../src/auth/proxy-target';
import { userApiPaths } from '../src/core/api-paths';
import { createProductEventTracker, productEventKey } from '../src/core/analytics/product-events';

describe('product events', () => {
  it('sends each event once per page session', async () => {
    const sent: unknown[] = [];
    const track = createProductEventTracker(async (body) => sent.push(JSON.parse(body)));

    track({ event: 'graph_opened', projectId: 'abcdefghij' });
    track({ event: 'graph_opened', projectId: 'abcdefghij' });
    track({ event: 'graph_opened', projectId: 'klmnopqrst' });
    track({ appVersion: '1.2.0', event: 'desktop_app_opened', os: 'darwin' });
    track({ appVersion: '1.2.0', event: 'desktop_app_opened', os: 'darwin' });

    assert.deepEqual(sent, [
      { event: 'graph_opened', projectId: 'abcdefghij' },
      { event: 'graph_opened', projectId: 'klmnopqrst' },
      { appVersion: '1.2.0', event: 'desktop_app_opened', os: 'darwin' },
    ]);
  });

  it('never throws, even when the transport does', async () => {
    const track = createProductEventTracker(() => {
      throw new Error('offline');
    });
    const rejecting = createProductEventTracker(() => Promise.reject(new Error('offline')));

    assert.doesNotThrow(() => track({ event: 'graph_opened', projectId: 'abcdefghij' }));
    assert.doesNotThrow(() => rejecting({ event: 'graph_opened', projectId: 'abcdefghij' }));
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('keys Graph events by project', () => {
    assert.equal(productEventKey({ event: 'graph_opened', projectId: 'abc' }), 'graph_opened:abc');
  });

  it('goes to the backend through the user-level proxy segment', () => {
    assert.deepEqual(resolveProxyTarget(userApiPaths.productEvents), {
      auth: 'bearer',
      url: 'https://flexkit.io/api/product-events',
    });
  });
});
