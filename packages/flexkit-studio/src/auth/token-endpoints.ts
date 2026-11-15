/**
 * Checks for the two endpoints that put a session into the Studio's cookie
 * (`/api/flexkit/get-token` after a provider login, `/api/flexkit/set-token`
 * after an email login). Both are reachable by anyone who can make the
 * browser send a request, so each has to be sure the session is one this
 * browser asked for, and neither may send the browser somewhere else.
 */

/**
 * Cookie the login screen sets before leaving for the provider; the callback
 * must echo its value. On HTTPS it carries the `__Host-` prefix, which a
 * browser only accepts from this exact host, so a sibling subdomain cannot
 * plant a value of its choosing. Plain-HTTP local development cannot use the
 * prefix and falls back to the bare name, which the callback only accepts on
 * localhost.
 */
export const LOGIN_STATE_COOKIE = '__Host-flexkitLoginState';
export const LOCAL_LOGIN_STATE_COOKIE = 'flexkitLoginState';
export const LOGIN_STATE_MAX_AGE_SECONDS = 10 * 60;

/** What the backend accepts and echoes as `state`. */
const LOGIN_STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
/** A session id as the backend issues it. Nothing that could end the cookie value or add an attribute. */
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function createLoginState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));

  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

/** The cookie string (for `document.cookie`) that remembers a login this browser started. */
export function serializeLoginStateCookie(state: string, isSecure: boolean): string {
  const name = isSecure ? LOGIN_STATE_COOKIE : LOCAL_LOGIN_STATE_COOKIE;

  // Lax, not Strict: the provider sends the browser back with a top-level navigation from another site.
  return `${name}=${state}; Path=/; Max-Age=${String(LOGIN_STATE_MAX_AGE_SECONDS)}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

/**
 * The state a login screen should use: the one already in the browser's
 * cookie, so several tabs share it and none invalidates another's login, or a
 * new one.
 */
export function getOrCreateLoginState(cookies: string, isSecure: boolean): string {
  const existing = readCookie(cookies, isSecure ? LOGIN_STATE_COOKIE : LOCAL_LOGIN_STATE_COOKIE);

  return LOGIN_STATE_PATTERN.test(existing) ? existing : createLoginState();
}

export function readCookie(cookieHeader: string | null | undefined, name: string): string {
  for (const part of (cookieHeader ?? '').split(';')) {
    const separator = part.indexOf('=');

    if (separator !== -1 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }

  return '';
}

/**
 * Whether a login callback belongs to a login this browser started: the
 * `state` it carries is the one in the browser's cookie. Without this, a link
 * to the callback with someone else's code would sign the visitor in to that
 * other account without their noticing.
 */
export function isExpectedLoginState(state: string | null | undefined, request: Request): boolean {
  const cookieHeader = request.headers.get('cookie');
  const hostname = getRequestHost(request).split(':')[0] ?? '';
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const expected =
    readCookie(cookieHeader, LOGIN_STATE_COOKIE) || (isLocal ? readCookie(cookieHeader, LOCAL_LOGIN_STATE_COOKIE) : '');

  return typeof state === 'string' && LOGIN_STATE_PATTERN.test(state) && state === expected;
}

function getRequestHost(request: Request): string {
  // Behind several proxies the header lists them all; the first is the host the browser used.
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');

  try {
    return (forwarded ?? new URL(request.url).host).toLowerCase();
  } catch {
    return '';
  }
}

/** A path that still starts with `//` after normalisation would be read as another host. */
function toLocalPath(url: URL): string {
  return url.pathname.startsWith('//') ? '/' : `${url.pathname}${url.search}${url.hash}`;
}

function hasUnsafeCharacter(value: string): boolean {
  // A backslash is read as a slash by browsers; control characters can split a header.
  return [...value].some((character) => {
    const code = character.charCodeAt(0);

    return character === '\\' || code < 0x20 || code === 0x7f;
  });
}

/**
 * Where to go after signing in: a path of this application, or `/`.
 *
 * The login screen passes the page it was opened on, as a path or as a full
 * URL of this application. A URL of any other host, `//host`, a backslash or
 * a control character is replaced, and what is returned is always a path, so
 * the answer can never send the browser to another site.
 */
export function getSafeRedirectPath(value: string | null | undefined, request: Request): string {
  if (!value || hasUnsafeCharacter(value)) {
    return '/';
  }

  const placeholder = 'https://studio.invalid';

  try {
    if (value.startsWith('/')) {
      const url = new URL(value, placeholder);

      // `//host/path` and paths that normalise to another host resolve away from the placeholder.
      return value.startsWith('//') || url.origin !== placeholder ? '/' : toLocalPath(url);
    }

    const url = new URL(value);
    const isThisApplication =
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.username === '' &&
      url.password === '' &&
      url.host.toLowerCase() === getRequestHost(request);

    return isThisApplication ? toLocalPath(url) : '/';
  } catch {
    return '/';
  }
}

export function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_PATTERN.test(value);
}

/**
 * Whether a request was sent by a page of this application. A form or script
 * on another site can post here too, and would otherwise be able to plant a
 * session of its choosing in the visitor's Studio.
 */
export function isSameOriginRequest(request: Request): boolean {
  // The browser's own verdict, which no page can forge and which does not depend on how a
  // reverse proxy reports the host.
  const fetchSite = request.headers.get('sec-fetch-site');

  if (fetchSite) {
    return fetchSite === 'same-origin';
  }

  const origin = request.headers.get('origin');

  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).host.toLowerCase() === getRequestHost(request);
  } catch {
    return false;
  }
}

/**
 * Whether a request is known to come from another site: the browser says so,
 * or names an origin that is not this application's. Unlike
 * `isSameOriginRequest`, a request that says nothing about where it comes
 * from is let through, so this suits a route that existing integrations call
 * with a plain GET, such as logout: opening it from the address bar or with a
 * same-origin fetch keeps working, an image or a link on another site does
 * not.
 */
export function isCrossSiteRequest(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');

  if (fetchSite) {
    // `none` is a navigation the person started themselves, such as typing the address.
    return fetchSite !== 'same-origin' && fetchSite !== 'none';
  }

  const origin = request.headers.get('origin');

  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).host.toLowerCase() !== getRequestHost(request);
  } catch {
    return true;
  }
}
