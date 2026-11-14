import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { handleFlexkitRequest } from '../src/auth/core-handler';
import {
  createLoginState,
  getSafeRedirectPath,
  isExpectedLoginState,
  isSameOriginRequest,
  isSessionId,
  readCookie,
  serializeLoginStateCookie,
} from '../src/auth/token-endpoints';

const ORIGIN = 'https://studio.example.com';
const SID = '0123456789abcdef0123456789abcdef';
const STATE = 'abcdefghijklmnop_-0123456789';

function request(
  path: string,
  init: { body?: string; headers?: { [name: string]: string }; method?: string } = {}
): Request {
  return new Request(`${ORIGIN}${path}`, {
    body: init.body,
    headers: { host: 'studio.example.com', ...init.headers },
    method: init.method ?? 'GET',
  });
}

function handle(req: Request): ReturnType<typeof handleFlexkitRequest> {
  const url = new URL(req.url);

  return handleFlexkitRequest({
    contentType: req.headers.get('content-type'),
    pathname: url.pathname,
    request: req,
    search: url.search,
    sessionToken: '',
  });
}

afterEach(() => {
  mock.restoreAll();
});

describe('getSafeRedirectPath', () => {
  const req = request('/api/flexkit/get-token');

  it('keeps a path or a URL of this application, as a path', () => {
    assert.equal(getSafeRedirectPath('/desk/products?tab=1#top', req), '/desk/products?tab=1#top');
    assert.equal(getSafeRedirectPath(`${ORIGIN}/desk/products?tab=1`, req), '/desk/products?tab=1');
    assert.equal(getSafeRedirectPath('https://STUDIO.example.com/x', req), '/x');
  });

  it('replaces anything that could lead to another site', () => {
    for (const value of [
      'https://evil.example/x',
      '//evil.example/x',
      '/\\\\evil.example/x',
      '\\\\\\\\evil.example',
      'https://studio.example.com@evil.example/x',
      'https://user:pass@studio.example.com/x',
      'https://studio.example.com.evil.example/x',
      'javascript:alert(1)',
      'data:text/html,x',
      '/x\\r\\nSet-Cookie: a=b',
      'relative/path',
      '',
      null,
      undefined,
    ]) {
      assert.equal(getSafeRedirectPath(value, req), '/', String(value));
    }
  });

  it('judges a full URL by the host the browser used, behind a proxy too', () => {
    const proxied = request('/api/flexkit/get-token', {
      headers: { host: 'internal:3000', 'x-forwarded-host': 'studio.example.com' },
    });

    assert.equal(getSafeRedirectPath(`${ORIGIN}/desk`, proxied), '/desk');
    assert.equal(getSafeRedirectPath('https://internal:3000/desk', proxied), '/');
  });
});

describe('login state', () => {
  it('creates a value the backend echoes, and a cookie that comes back on the provider redirect', () => {
    const state = createLoginState();

    assert.match(state, /^[A-Za-z0-9_-]{32}$/);
    assert.notEqual(createLoginState(), state);
    assert.equal(
      serializeLoginStateCookie(state, true),
      `flexkitLoginState=${state}; Path=/; Max-Age=600; SameSite=Lax; Secure`
    );
  });

  it('accepts only the state this browser holds', () => {
    assert.equal(isExpectedLoginState(STATE, `a=b; flexkitLoginState=${STATE}; c=d`), true);
    assert.equal(isExpectedLoginState(STATE, 'flexkitLoginState=other-state-0123456789'), false);
    assert.equal(isExpectedLoginState(STATE, ''), false);
    assert.equal(isExpectedLoginState(null, `flexkitLoginState=${STATE}`), false);
    // An empty value on both sides is not a match.
    assert.equal(isExpectedLoginState('', 'flexkitLoginState='), false);
    assert.equal(readCookie('xflexkitLoginState=1; flexkitLoginState=2', 'flexkitLoginState'), '2');
  });
});

describe('isSessionId and isSameOriginRequest', () => {
  it('accepts a session id and nothing that could alter the cookie', () => {
    assert.equal(isSessionId(SID), true);

    for (const value of ['', 'short', `${SID}; Domain=evil.example`, `${SID}\\r\\nX: y`, 42, null, undefined]) {
      assert.equal(isSessionId(value), false, String(value));
    }
  });

  it('accepts a request from a page of this application only', () => {
    assert.equal(isSameOriginRequest(request('/x', { headers: { origin: ORIGIN } })), true);
    assert.equal(isSameOriginRequest(request('/x', { headers: { origin: 'https://evil.example' } })), false);
    assert.equal(isSameOriginRequest(request('/x', { headers: { origin: 'null' } })), false);
    assert.equal(isSameOriginRequest(request('/x', { headers: { 'sec-fetch-site': 'same-origin' } })), true);
    assert.equal(isSameOriginRequest(request('/x', { headers: { 'sec-fetch-site': 'cross-site' } })), false);
    assert.equal(isSameOriginRequest(request('/x')), false);
  });
});

describe('/api/flexkit/get-token', () => {
  it('signs in a login this browser started and returns to the page it came from', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ sid: SID }));
    const result = await handle(
      request(`/api/flexkit/get-token?code=c1&state=${STATE}&redirect=${encodeURIComponent(`${ORIGIN}/desk`)}`, {
        headers: { cookie: `flexkitLoginState=${STATE}` },
      })
    );

    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(result.headers?.Location, '/desk');
    assert.match(result.setCookie ?? '', new RegExp(`^sessionToken=${SID}; `));
  });

  it('does not exchange a code for a login this browser did not start', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ sid: SID }));

    for (const req of [
      request('/api/flexkit/get-token?code=attacker-code'),
      request(`/api/flexkit/get-token?code=attacker-code&state=${STATE}`),
      request(`/api/flexkit/get-token?code=attacker-code&state=${STATE}`, {
        headers: { cookie: 'flexkitLoginState=another-state-0123456789' },
      }),
    ]) {
      const result = await handle(req);

      assert.equal(result.headers?.Location, '/');
      assert.equal(result.setCookie, undefined);
    }

    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it('never redirects to another site', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json({ sid: SID }));

    const result = await handle(
      request(`/api/flexkit/get-token?code=c1&state=${STATE}&redirect=${encodeURIComponent('https://evil.example/')}`, {
        headers: { cookie: `flexkitLoginState=${STATE}` },
      })
    );

    assert.equal(result.headers?.Location, '/');
  });

  it('sets no cookie when the code is not exchanged for a session', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json({ error: 'invalid' }));

    const result = await handle(
      request(`/api/flexkit/get-token?code=bad&state=${STATE}`, { headers: { cookie: `flexkitLoginState=${STATE}` } })
    );

    assert.equal(result.setCookie, undefined);
  });
});

describe('/api/flexkit/set-token', () => {
  const post = (headers: { [name: string]: string }, body: unknown, path = '/api/flexkit/set-token'): Request =>
    request(path, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', ...headers },
      method: 'POST',
    });

  it('stores the session the login screen posts', async () => {
    const result = await handle(post({ origin: ORIGIN }, { sid: SID }));

    assert.equal(result.status, 307);
    assert.match(result.setCookie ?? '', new RegExp(`^sessionToken=${SID}; `));
  });

  it('refuses a post from another site', async () => {
    const result = await handle(post({ origin: 'https://evil.example' }, { sid: SID }));

    assert.equal(result.status, 403);
    assert.equal(result.setCookie, undefined);
  });

  it('refuses a value that is not a session id', async () => {
    for (const sid of ['', `${SID}; Domain=evil.example`, undefined]) {
      const result = await handle(post({ origin: ORIGIN }, { sid }));

      assert.equal(result.status, 400);
      assert.equal(result.setCookie, undefined);
    }
  });

  it('never redirects to another site', async () => {
    const result = await handle(
      post({ origin: ORIGIN }, { sid: SID }, `/api/flexkit/set-token?redirect=${encodeURIComponent('//evil.example')}`)
    );

    assert.equal(result.headers?.Location, '/');
  });
});
