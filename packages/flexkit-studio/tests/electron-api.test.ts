import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  completeDesktopLogin,
  createFlexkitElectronHandler,
  isDesktopLoginStart,
  parseDesktopLoginCallback,
  parseSessionCookie,
  withDesktopLoginState,
  type DesktopSessionStore,
} from '../src/auth/electron-api';

const CODE = '123e4567-e89b-42d3-a456-426614174000';
const STATE = 'Vf3a_9-KpQ2sL8mNxY1wZ0cR';
const LOGIN_START = 'https://flexkit.io/auth/login/google?origin=flexkit%3A%2F%2Fauth%2Fcallback&redirect=%2F';

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
    assert.deepEqual(parseDesktopLoginCallback(`flexkit://auth/callback?code=${CODE}&redirect=%2Fabcdefghij%2Fdesk&state=${STATE}`), {
      code: CODE,
      redirect: '/abcdefghij/desk',
      state: STATE,
    });
    assert.deepEqual(parseDesktopLoginCallback(`flexkit://auth/callback?code=${CODE}`), { code: CODE, redirect: '/', state: null });
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

  it('drops a malformed state', () => {
    assert.equal(parseDesktopLoginCallback(`flexkit://auth/callback?code=${CODE}&state=short`)?.state, null);
    assert.equal(parseDesktopLoginCallback(`flexkit://auth/callback?code=${CODE}&state=has%20space%20in%20it%20here`)?.state, null);
  });
});

describe('login start', () => {
  it('recognises a login the Studio starts for the desktop callback', () => {
    assert.equal(isDesktopLoginStart(LOGIN_START), true);
    assert.equal(isDesktopLoginStart('https://www.flexkit.io/auth/login/github?origin=flexkit%3A%2F%2Fauth%2Fcallback'), true);
    assert.equal(isDesktopLoginStart('https://flexkit.io/auth/login/google?origin=https%3A%2F%2Fother.example'), false);
    assert.equal(isDesktopLoginStart('https://evil.example/auth/login/x?origin=flexkit%3A%2F%2Fauth%2Fcallback'), false);
    assert.equal(isDesktopLoginStart('https://flexkit.io.evil.example/auth/login/x?origin=flexkit%3A%2F%2Fauth%2Fcallback'), false);
    assert.equal(isDesktopLoginStart('https://flexkit.io/docs'), false);
    assert.equal(isDesktopLoginStart('http://flexkit.io/auth/login/google?origin=flexkit%3A%2F%2Fauth%2Fcallback'), false);
    assert.equal(isDesktopLoginStart('not a url'), false);
  });

  it('adds the nonce for the backend to echo', () => {
    const url = new URL(withDesktopLoginState(LOGIN_START, STATE));

    assert.equal(url.searchParams.get('state'), STATE);
    assert.equal(url.searchParams.get('origin'), 'flexkit://auth/callback');
    assert.equal(url.searchParams.get('redirect'), '/');
  });
});

describe('completeDesktopLogin', () => {
  it('exchanges the code of the login this app started and stores the session', async () => {
    const store = memoryStore();
    const calls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));

      return Response.json({ sid: 'sid-1' });
    }) as typeof fetch;

    assert.equal(
      await completeDesktopLogin(`flexkit://auth/callback?code=${CODE}&redirect=%2Fp%2Fai&state=${STATE}`, store, {
        expectedState: STATE,
      }),
      '/p/ai'
    );
    assert.equal(store.token, 'sid-1');
    assert.equal(calls[0], `https://flexkit.io/api/auth/login/session?code=${CODE}`);
  });

  it('never exchanges a callback for a login it did not start', async () => {
    const store = memoryStore();
    let calls = 0;

    globalThis.fetch = (async () => {
      calls += 1;

      return Response.json({ sid: 'sid-1' });
    }) as typeof fetch;

    // No login in flight, a missing state, a different state.
    assert.equal(await completeDesktopLogin(`flexkit://auth/callback?code=${CODE}&state=${STATE}`, store, { expectedState: null }), null);
    assert.equal(await completeDesktopLogin(`flexkit://auth/callback?code=${CODE}`, store, { expectedState: STATE }), null);
    assert.equal(
      await completeDesktopLogin(`flexkit://auth/callback?code=${CODE}&state=${STATE}x`, store, { expectedState: STATE }),
      null
    );
    assert.equal(calls, 0);
    assert.equal(store.token, '');
  });

  it('stores nothing when the code is refused', async () => {
    const store = memoryStore();

    globalThis.fetch = (async () => Response.json({ sid: '' })) as typeof fetch;

    assert.equal(await completeDesktopLogin(`flexkit://auth/callback?code=${CODE}&state=${STATE}`, store, { expectedState: STATE }), null);
    assert.equal(await completeDesktopLogin('flexkit://auth/callback?code=bad&state=' + STATE, store, { expectedState: STATE }), null);
    assert.equal(store.token, '');
  });
});

describe('createFlexkitElectronHandler', () => {
  it('has no web login callback', async () => {
    const handle = createFlexkitElectronHandler({ sessionStore: memoryStore() });
    const response = await handle(new Request(`flexkit://app/api/flexkit/get-token?code=${CODE}`));

    assert.equal(response.status, 404);
  });

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
