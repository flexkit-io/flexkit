import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  completeDesktopLogin,
  createFlexkitElectronHandler,
  parseDesktopLoginCallback,
  parseSessionCookie,
  type DesktopSessionStore,
} from '../src/auth/electron-api';

const CODE = '123e4567-e89b-42d3-a456-426614174000';

function memoryStore(initial = ''): DesktopSessionStore & { token: string; cleared: number } {
  const store = {
    token: initial,
    cleared: 0,
    get: () => store.token,
    set: (token: string) => {
      store.token = token;
    },
    clear: () => {
      store.token = '';
      store.cleared += 1;
    },
  };

  return store;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('parseSessionCookie', () => {
  it('reads the session the BFF core sets or clears', () => {
    assert.deepEqual(parseSessionCookie('sessionToken=abc; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000;'), {
      type: 'set',
      token: 'abc',
    });
    assert.deepEqual(parseSessionCookie('sessionToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0;'), {
      type: 'clear',
    });
    assert.deepEqual(parseSessionCookie('sessionToken=abc; Max-Age=0'), { type: 'clear' });
  });

  it('ignores other cookies', () => {
    assert.equal(parseSessionCookie('other=1; Path=/'), null);
    assert.equal(parseSessionCookie(''), null);
  });
});

describe('parseDesktopLoginCallback', () => {
  it('accepts the exact callback with a code and an in-app redirect', () => {
    assert.deepEqual(parseDesktopLoginCallback(`flexkit://auth/callback?code=${CODE}&redirect=%2Fabcdefghij%2Fdesk`), {
      code: CODE,
      redirect: '/abcdefghij/desk',
    });
    assert.deepEqual(parseDesktopLoginCallback(`flexkit://auth/callback?code=${CODE}`), { code: CODE, redirect: '/' });
  });

  it('keeps the redirect inside the app', () => {
    assert.equal(parseDesktopLoginCallback(`flexkit://auth/callback?code=${CODE}&redirect=https://evil.example`)?.redirect, '/');
    assert.equal(parseDesktopLoginCallback(`flexkit://auth/callback?code=${CODE}&redirect=//evil.example`)?.redirect, '/');
    assert.equal(parseDesktopLoginCallback(`flexkit://auth/callback?code=${CODE}&redirect=abc`)?.redirect, '/');
  });

  it('refuses other paths, hosts, schemes and malformed codes', () => {
    assert.equal(parseDesktopLoginCallback(`flexkit://auth/callback/x?code=${CODE}`), null);
    assert.equal(parseDesktopLoginCallback(`flexkit://app/auth/callback?code=${CODE}`), null);
    assert.equal(parseDesktopLoginCallback(`https://auth/callback?code=${CODE}`), null);
    assert.equal(parseDesktopLoginCallback(`flexkit://user@auth/callback?code=${CODE}`), null);
    assert.equal(parseDesktopLoginCallback('flexkit://auth/callback?code=not-a-code'), null);
    assert.equal(parseDesktopLoginCallback('flexkit://auth/callback'), null);
    assert.equal(parseDesktopLoginCallback('not a url'), null);
  });
});

describe('completeDesktopLogin', () => {
  it('exchanges the code and stores the session', async () => {
    const store = memoryStore();
    const calls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));

      return Response.json({ sid: 'sid-1' });
    }) as typeof fetch;

    assert.equal(await completeDesktopLogin(`flexkit://auth/callback?code=${CODE}&redirect=%2Fp%2Fai`, store), '/p/ai');
    assert.equal(store.token, 'sid-1');
    assert.equal(calls[0], `https://flexkit.io/api/auth/login/session?code=${CODE}`);
  });

  it('stores nothing when the code is refused', async () => {
    const store = memoryStore();

    globalThis.fetch = (async () => Response.json({ sid: '' })) as typeof fetch;

    assert.equal(await completeDesktopLogin(`flexkit://auth/callback?code=${CODE}`, store), null);
    assert.equal(await completeDesktopLogin('flexkit://auth/callback?code=bad', store), null);
    assert.equal(store.token, '');
  });
});

describe('createFlexkitElectronHandler', () => {
  it('proxies with the stored session and forwards the response', async () => {
    const store = memoryStore('sid-1');
    let forwarded: Request | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = new Request(input, init);

      return new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    const handler = createFlexkitElectronHandler({ sessionStore: store });
    const response = await handler(new Request('flexkit://app/api/flexkit/-/me', { headers: { Cookie: 'x=1' } }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(forwarded?.url, 'https://flexkit.io/api/me');
    assert.equal(forwarded?.headers.get('authorization'), 'Bearer sid-1');
    assert.equal(forwarded?.headers.get('cookie'), null);

    await handler(new Request('flexkit://app/api/flexkit/abcdefghij/users/me'));
    assert.equal(forwarded?.url, 'https://abcdefghij.api.flexkit.io/users/me');
    assert.equal(forwarded?.headers.get('cookie'), 'sessionToken=sid-1');
  });

  it('stores the session from set-token and drops it on logout, without redirecting', async () => {
    const store = memoryStore('old');
    const handler = createFlexkitElectronHandler({ sessionStore: store });

    const setToken = await handler(
      new Request('flexkit://app/api/flexkit/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid: 'sid-2' }),
      })
    );

    assert.equal(setToken.status, 204);
    assert.equal(store.token, 'sid-2');

    const logout = await handler(new Request('flexkit://app/api/flexkit/logout'));

    assert.equal(logout.status, 204);
    assert.equal(store.token, '');
    assert.equal(store.cleared, 1);
  });

  it('answers 502 when Flexkit cannot be reached', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;

    const handler = createFlexkitElectronHandler({ sessionStore: memoryStore('sid') });
    const response = await handler(new Request('flexkit://app/api/flexkit/abcdefghij/schema'));

    assert.equal(response.status, 502);
    assert.match(((await response.json()) as { error: string }).error, /not reachable/);
  });

  it('answers 404 outside the BFF path', async () => {
    const handler = createFlexkitElectronHandler({ sessionStore: memoryStore() });

    assert.equal((await handler(new Request('flexkit://app/index.html'))).status, 404);
  });
});
