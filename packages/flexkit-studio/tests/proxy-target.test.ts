import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveProxyTarget } from '../src/auth/proxy-target';

describe('resolveProxyTarget', () => {
  it('sends project routes to the project API with the session cookie', () => {
    assert.deepEqual(resolveProxyTarget('/api/flexkit/abcdefghij/users/me', '?x=1'), {
      auth: 'cookie',
      url: 'https://abcdefghij.api.flexkit.io/users/me?x=1',
    });
    assert.deepEqual(resolveProxyTarget('/api/flexkit/abcdefghij/graphql'), {
      auth: 'cookie',
      url: 'https://abcdefghij.api.flexkit.io/graphql',
    });
  });

  it('sends the reserved segment to the user-level API as a bearer token', () => {
    assert.deepEqual(resolveProxyTarget('/api/flexkit/-/me'), { auth: 'bearer', url: 'https://flexkit.io/api/me' });
    assert.deepEqual(resolveProxyTarget('/api/flexkit/-/auth/otp/confirm', '?email=a%40b.io&token=t'), {
      auth: 'bearer',
      url: 'https://flexkit.io/api/auth/otp/confirm?email=a%40b.io&token=t',
    });
  });
});
