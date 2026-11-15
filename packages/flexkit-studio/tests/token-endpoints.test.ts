import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { handleFlexkitRequest } from '../src/auth/core-handler';
import {
  createLoginState,
  getOrCreateLoginState,
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
      '/x\r\nSet-Cookie: a=b',
      // Paths that normalise to `//host`, which a browser reads as another site.
      'https://studio.example.com//evil.example/x',
      '/..//evil.example/x',
      '/.//evil.example',
      '/%2e%2e//evil.example',
      '/a/../..//evil.example',
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
  const callback = (cookie: string, host = 'studio.example.com'): Request =>
    request('/api/flexkit/get-token', { headers: { cookie, host } });

  it('creates a value the backend echoes, in a cookie only this exact host can set', () => {
    const state = createLoginState();

    assert.match(state, /^[A-Za-z0-9_-]{32}$/);
    assert.notEqual(createLoginState(), state);
    assert.equal(
      serializeLoginStateCookie(state, true),
      `__Host-flexkitLoginState=${state}; Path=/; Max-Age=600; SameSite=Lax; Secure`
    );
    // Plain HTTP (local development) cannot use the prefix.
    assert.equal(
      serializeLoginStateCookie(state, false),
      `flexkitLoginState=${state}; Path=/; Max-Age=600; SameSite=Lax`
    );
  });

  it('reuses the state already in the cookie, so tabs do not invalidate each other', () => {
    assert.equal(getOrCreateLoginState(`a=b; __Host-flexkitLoginState=${STATE}`, true), STATE);
    assert.equal(getOrCreateLoginState(`flexkitLoginState=${STATE}`, false), STATE);
    assert.notEqual(getOrCreateLoginState('', true), STATE);
    assert.match(getOrCreateLoginState('__Host-flexkitLoginState=bad value', true), /^[A-Za-z0-9_-]{32}$/);
  });

  it('accepts only the state this browser holds', () => {
    assert.equal(isExpectedLoginState(STATE, callback(`a=b; __Host-flexkitLoginState=${STATE}; c=d`)), true);
    assert.equal(isExpectedLoginState(STATE, callback('__Host-flexkitLoginState=other-state-0123456789')), false);
    assert.equal(isExpectedLoginState(STATE, callback('')), false);
    assert.equal(isExpectedLoginState(null, callback(`__Host-flexkitLoginState=${STATE}`)), false);
    // An empty value on both sides is not a match.
    assert.equal(isExpectedLoginState('', callback('__Host-flexkitLoginState=')), false);
    assert.equal(readCookie('xflexkitLoginState=1; flexkitLoginState=2', 'flexkitLoginState'), '2');
  });

  it('does not accept the unprefixed cookie, which a sibling subdomain can plant, except on localhost', () => {
    assert.equal(isExpectedLoginState(STATE, callback(`flexkitLoginState=${STATE}`)), false);
    assert.equal(isExpectedLoginState(STATE, callback(`flexkitLoginState=${STATE}`, 'localhost:3000')), true);
    assert.equal(isExpectedLoginState(STATE, callback(`flexkitLoginState=${STATE}`, '127.0.0.1:3000')), true);
    // A planted bare cookie does not win over the real one either.
    assert.equal(
      isExpectedLoginState(
        STATE,
        callback(`flexkitLoginState=planted-state-0123456789; __Host-flexkitLoginState=${STATE}`)
      ),
      true
    );
  });
});

describe('isSessionId and isSameOriginRequest', () => {
  it('accepts a session id and nothing that could alter the cookie', () => {
    assert.equal(isSessionId(SID), true);

    for (const value of [
      '',
      'short',
      `${SID}; Domain=evil.example`,
      `${SID}\r\nX: y`,
      `${SID}\n`,
      42,
      null,
      undefined,
    ]) {
      assert.equal(isSessionId(value), false, String(value));
    }
  });

  it('accepts a request from a page of this application only', () => {
    assert.equal(isSameOriginRequest(request('/x', { headers: { origin: ORIGIN } })), true);
    assert.equal(isSameOriginRequest(request('/x', { headers: { origin: 'https://evil.example' } })), false);
    assert.equal(isSameOriginRequest(request('/x', { headers: { origin: 'null' } })), false);
    assert.equal(isSameOriginRequest(request('/x')), false);
  });

  it("goes by the browser's own verdict when it sends one, whatever the proxy says about the host", () => {
    // A reverse proxy that rewrites Host and forwards nothing.
    const behindProxy = { host: 'internal:3000', origin: ORIGIN };

    assert.equal(isSameOriginRequest(request('/x', { headers: behindProxy })), false);
    assert.equal(
      isSameOriginRequest(request('/x', { headers: { ...behindProxy, 'sec-fetch-site': 'same-origin' } })),
      true
    );

    for (const verdict of ['cross-site', 'same-site', 'none']) {
      assert.equal(
        isSameOriginRequest(request('/x', { headers: { origin: ORIGIN, 'sec-fetch-site': verdict } })),
        false
      );
    }
  });

  it('reads the first host of a chain of proxies', () => {
    assert.equal(
      isSameOriginRequest(
        request('/x', {
          headers: { host: 'internal', origin: ORIGIN, 'x-forwarded-host': 'studio.example.com, edge.internal' },
        })
      ),
      true
    );
  });
});

describe('/api/flexkit/get-token', () => {
  it('signs in a login this browser started and returns to the page it came from', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ sid: SID }));
    const result = await handle(
      request(`/api/flexkit/get-token?code=c1&state=${STATE}&redirect=${encodeURIComponent(`${ORIGIN}/desk`)}`, {
        headers: { cookie: `__Host-flexkitLoginState=${STATE}` },
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
        headers: { cookie: '__Host-flexkitLoginState=another-state-0123456789' },
      }),
    ]) {
      const result = await handle(req);

      assert.equal(result.headers?.Location, '/');
      assert.equal(result.setCookie, undefined);
    }

    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it('sends a refused login back to the page of the Studio it came from, not to the site root', async () => {
    const result = await handle(request('/api/flexkit/get-token?code=x&redirect=%2Fstudio%2Fdesk'));

    assert.equal(result.headers?.Location, '/studio/desk');
    assert.equal(result.setCookie, undefined);
  });

  it('never redirects to another site', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json({ sid: SID }));

    const result = await handle(
      request(`/api/flexkit/get-token?code=c1&state=${STATE}&redirect=${encodeURIComponent('https://evil.example/')}`, {
        headers: { cookie: `__Host-flexkitLoginState=${STATE}` },
      })
    );

    assert.equal(result.headers?.Location, '/');
  });

  it('sets no cookie when the code is not exchanged for a session', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json({ error: 'invalid' }));

    const result = await handle(
      request(`/api/flexkit/get-token?code=bad&state=${STATE}`, {
        headers: { cookie: `__Host-flexkitLoginState=${STATE}` },
      })
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

describe('logout', () => {
  const logout = (init: { headers?: { [key: string]: string }; method?: string }) =>
    handle(request('/api/flexkit/logout', init));

  it('clears the session for the application itself', async () => {
    const result = await logout({ headers: { 'sec-fetch-site': 'same-origin' }, method: 'POST' });

    assert.equal(result.status, 200);
    assert.match(result.setCookie ?? '', /^sessionToken=; .*Max-Age=0;/);
  });

  it('is not triggered by a link or an image on another site', async () => {
    const result = await logout({ headers: { 'sec-fetch-site': 'cross-site' }, method: 'GET' });

    assert.equal(result.status, 405);
    assert.equal(result.setCookie, undefined);
  });

  it('refuses a post from another site', async () => {
    for (const headers of [{ 'sec-fetch-site': 'cross-site' }, { origin: 'https://evil.example' }, {}]) {
      const result = await logout({ headers, method: 'POST' });

      assert.equal(result.status, 403);
      assert.equal(result.setCookie, undefined);
    }
  });
});
