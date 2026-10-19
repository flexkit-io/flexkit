import { handleFlexkitRequest, type FlexkitHandlerResult } from './core-handler';
import { getToken } from './get-token';

/**
 * Where the OAuth login hands the one-time session code to the desktop app.
 * The app registers the `flexkit://` scheme with the operating system; the
 * Flexkit backend allows exactly this URL as a login callback.
 */
export const DESKTOP_LOGIN_CALLBACK = 'flexkit://auth/callback';

/**
 * Where the desktop app keeps the Flexkit session. The app stores it encrypted
 * with the operating system's keychain (Electron `safeStorage`); this module
 * never sees where.
 */
export interface DesktopSessionStore {
  get: () => Promise<string> | string;
  set: (token: string) => Promise<void> | void;
  clear: () => Promise<void> | void;
}

export type SessionChange = { type: 'set'; token: string } | { type: 'clear' };

/**
 * Reads the session change the BFF core expresses as a `Set-Cookie` header.
 * Returns null for cookies that are not the session.
 */
export function parseSessionCookie(setCookie: string): SessionChange | null {
  const [pair = '', ...attributes] = setCookie.split(';');
  const separator = pair.indexOf('=');

  if (separator === -1 || pair.slice(0, separator).trim() !== 'sessionToken') {
    return null;
  }

  const token = pair.slice(separator + 1).trim();
  const expired = attributes.some((attribute) => attribute.trim().toLowerCase() === 'max-age=0');

  if (!token || expired) {
    return { type: 'clear' };
  }

  return { type: 'set', token };
}

/** What a `flexkit://auth/callback` URL carries. */
export interface DesktopLoginCallback {
  code: string;
  /** In-app path to open after the login; always absolute within the app. */
  redirect: string;
}

/**
 * Parses the login callback the OS hands the app. Anything but the exact
 * callback path is refused, and the redirect is kept inside the app: only an
 * absolute path, never a URL (a `//host` prefix is a URL too).
 */
export function parseDesktopLoginCallback(url: string): DesktopLoginCallback | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (`${parsed.protocol}//${parsed.host}${parsed.pathname}` !== DESKTOP_LOGIN_CALLBACK || parsed.username || parsed.password) {
    return null;
  }

  const code = parsed.searchParams.get('code') ?? '';

  if (!/^[0-9a-f-]{36}$/i.test(code)) {
    return null;
  }

  const redirect = parsed.searchParams.get('redirect') ?? '/';

  return { code, redirect: redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/' };
}

/**
 * Finishes a desktop login: exchanges the code from the callback for a
 * session and stores it. Resolves to the in-app path to open, or null when
 * the callback or the code was not accepted.
 */
export async function completeDesktopLogin(url: string, sessionStore: DesktopSessionStore): Promise<string | null> {
  const callback = parseDesktopLoginCallback(url);

  if (!callback) {
    return null;
  }

  const { sid } = await getToken(callback.code);

  if (!sid) {
    return null;
  }

  await sessionStore.set(sid);

  return callback.redirect;
}

function resultToResponse(result: FlexkitHandlerResult): Response {
  const headers = new Headers(result.headers);

  // The Studio never follows the BFF's redirects itself (it navigates after the
  // call), and a 307 would make `fetch` replay a POST against the app's pages.
  if (result.type === 'redirect') {
    return new Response(null, { status: 204 });
  }

  if (result.type === 'text') {
    return new Response(result.body, { status: result.status, headers });
  }

  if (result.type === 'response') {
    return new Response(result.body, { status: result.status, headers });
  }

  headers.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}

export interface FlexkitElectronHandlerOptions {
  sessionStore: DesktopSessionStore;
}

/**
 * The Studio BFF for the desktop app: the handler the main process gives
 * `protocol.handle` for the Studio's `/api/flexkit/*` requests. It is the same
 * core the Next.js, Astro and TanStack Start adapters wrap, with the session
 * read from and written to the app's store instead of an HttpOnly cookie.
 *
 * @example
 * ```ts
 * const handleApi = createFlexkitElectronHandler({ sessionStore });
 *
 * protocol.handle('flexkit', (request) => {
 *   const { pathname } = new URL(request.url);
 *
 *   return pathname.startsWith('/api/flexkit/') ? handleApi(request) : serveStudio(request);
 * });
 * ```
 */
export function createFlexkitElectronHandler({
  sessionStore,
}: FlexkitElectronHandlerOptions): (request: Request) => Promise<Response> {
  return async function handleElectronRequest(request: Request): Promise<Response> {
    const { pathname, search } = new URL(request.url);

    if (!pathname.startsWith('/api/flexkit/')) {
      return new Response('Not found', { status: 404 });
    }

    let result: FlexkitHandlerResult;

    try {
      result = await handleFlexkitRequest({
        request,
        pathname,
        search,
        sessionToken: await sessionStore.get(),
        contentType: request.headers.get('content-type'),
      });
    } catch (error) {
      // Offline, DNS, TLS: a thrown handler would surface as a failed fetch
      // with no explanation; answer like an unreachable gateway instead.
      return Response.json(
        { error: `Flexkit is not reachable: ${error instanceof Error ? error.message : String(error)}` },
        { status: 502 }
      );
    }

    if (result.setCookie) {
      const change = parseSessionCookie(result.setCookie);

      if (change?.type === 'set') {
        await sessionStore.set(change.token);
      } else if (change?.type === 'clear') {
        await sessionStore.clear();
      }
    }

    return resultToResponse(result);
  };
}
