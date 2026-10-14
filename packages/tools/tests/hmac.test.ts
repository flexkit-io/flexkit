import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSignedHeaders, getUnixTimestampSeconds, verifySignedHeaders } from '../src/hmac';

const signed = { body: '{"name":"ping"}', method: 'POST', path: '/api/flexkit/tools' };

describe('hmac', () => {
  it('signs and verifies a request with the current secret', async () => {
    const headers = await createSignedHeaders({ ...signed, secret: 'current' });

    assert.match(headers['Flexkit-Signature']!, /^v1=/);
    assert.equal(
      await verifySignedHeaders({
        ...signed,
        secret: 'current',
        signatureHeader: headers['Flexkit-Signature']!,
        timestampHeader: headers['Flexkit-Timestamp']!,
      }),
      true
    );
  });

  it('accepts the previous signature during a rotation and rejects stale or tampered requests', async () => {
    const headers = await createSignedHeaders({ ...signed, previousSecret: 'old', secret: 'new' });
    const verify = (overrides: Partial<Parameters<typeof verifySignedHeaders>[0]>) =>
      verifySignedHeaders({
        ...signed,
        previousSignatureHeader: headers['Flexkit-Signature-Previous'],
        secret: ['old'],
        signatureHeader: headers['Flexkit-Signature']!,
        timestampHeader: headers['Flexkit-Timestamp']!,
        ...overrides,
      });

    assert.equal(await verify({}), true, 'previous secret still verifies');
    assert.equal(await verify({ body: '{"name":"pong"}' }), false, 'body is bound');
    assert.equal(await verify({ path: '/other' }), false, 'path is bound');
    assert.equal(await verify({ timestampHeader: String(getUnixTimestampSeconds() - 600) }), false, 'skew is enforced');
    assert.equal(await verify({ secret: 'unrelated' }), false);
  });
});
