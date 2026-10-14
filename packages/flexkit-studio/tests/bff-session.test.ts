import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveBffSession } from '../src/auth/bff-session';

describe('resolveBffSession', () => {
  it('prefers the session cookie', () => {
    assert.deepEqual(resolveBffSession('cookie-sid', null), { token: 'cookie-sid' });
    assert.deepEqual(resolveBffSession('cookie-sid', 'Bearer header-sid'), { token: 'cookie-sid' });
  });

  it('accepts a user session as a bearer token when there is no cookie', () => {
    assert.deepEqual(resolveBffSession('', 'Bearer header-sid'), { token: 'header-sid' });
    assert.deepEqual(resolveBffSession('', 'bearer header-sid'), { token: 'header-sid' });
  });

  it('ignores malformed authorization headers', () => {
    assert.deepEqual(resolveBffSession('', null), { token: '' });
    assert.deepEqual(resolveBffSession('', 'Basic abc'), { token: '' });
    assert.deepEqual(resolveBffSession('', 'Bearer'), { token: '' });
    assert.deepEqual(resolveBffSession('', 'Bearer a b'), { token: '' });
  });

  it('refuses API tokens even when a cookie is present', () => {
    assert.equal(typeof resolveBffSession('', 'Bearer flk-abc').error, 'string');
    assert.equal(typeof resolveBffSession('cookie-sid', 'Bearer flk-abc').error, 'string');
    assert.equal(resolveBffSession('', 'Bearer flk-abc').token, undefined);
  });
});
