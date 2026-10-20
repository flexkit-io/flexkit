import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { Readable } from 'node:stream';
import { protocol, session } from 'electron';
import { APP_HOST, APP_ORIGIN, APP_SCHEME } from './constants';

const MIME_TYPES: { [extension: string]: string } = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Must run before the app is ready: makes `flexkit://` behave like https
 * (origin, localStorage, fetch, streaming) for the Studio.
 */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true },
    },
  ]);
}

interface AppProtocolOptions {
  /** The Studio BFF: `/api/flexkit/*`. */
  handleApi: (request: Request) => Promise<Response>;
  /** The built renderer (production). */
  rendererDir: string;
  /** The Vite dev server (development): page requests are forwarded there. */
  devServerUrl?: string;
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Runs tasks at most `limit` at a time, in order. */
function createLimiter(limit: number): <T>(task: () => Promise<T>) => Promise<T> {
  const queue: (() => void)[] = [];
  let active = 0;

  function next(): void {
    active -= 1;
    queue.shift()?.();
  }

  return (task) =>
    new Promise((resolve, reject) => {
      function run(): void {
        active += 1;
        task().then(resolve, reject).finally(next);
      }

      if (active < limit) {
        run();
      } else {
        queue.push(run);
      }
    });
}

/**
 * Served from disk rather than through Chromium's loader (`net.fetch`), which
 * refuses when the Studio's many chunks are requested at once.
 */
function serveFile(path: string, cacheable: boolean): Response {
  return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': MIME_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
      // Hashed asset names change with their content; the page itself must not be cached.
      'Cache-Control': cacheable ? 'public, max-age=31536000, immutable' : 'no-cache',
    },
  });
}

/**
 * The BFF carries the person's session, so only the Studio window may call
 * it: a request from any other document in the session (a plugin's OAuth
 * popup) is blocked. Within the Studio window, the endpoints that change the
 * session answer script (`fetch`) only, never an image or a frame that in-app
 * content could plant. Downloads (a link to an artifact) stay possible.
 * This stands in for the cookie and same-origin rules a browser applies to
 * the hosted Studio.
 */
export function restrictApiToStudio(isStudioWebContents: (webContentsId: number | undefined) => boolean): void {
  const apiPrefix = `${APP_ORIGIN}/api/`;
  // Every route that reads or writes the session (see the BFF core).
  const sessionPaths = new Set(['/api/flexkit/get-token', '/api/flexkit/set-token', '/api/flexkit/logout', '/api/flexkit/-/auth/logout']);

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (!details.url.startsWith(apiPrefix)) {
      callback({});

      return;
    }

    const { pathname } = new URL(details.url);
    const isScript = details.resourceType === 'xhr';
    const allowed = isStudioWebContents(details.webContentsId) && (isScript || !sessionPaths.has(pathname));

    if (!allowed && process.env.FLEXKIT_DEBUG_PROTOCOL) {
      console.log('[protocol] blocked', details.resourceType, 'from', details.webContentsId, pathname);
    }

    callback({ cancel: !allowed });
  });
}

/**
 * Serves the Studio on `flexkit://app`: the BFF for `/api/flexkit/*`, the
 * renderer's files for everything else, and the page itself for paths the
 * router owns (`/abcdefghij/desk/...`).
 */
export function registerAppProtocol({ handleApi, rendererDir, devServerUrl }: AppProtocolOptions): void {
  const root = normalize(rendererDir + sep);
  // The unbundled Studio is well over a thousand modules; the dev server
  // resets connections when they all arrive at once.
  const forward = createLimiter(24);

  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);

    if (process.env.FLEXKIT_DEBUG_PROTOCOL) {
      console.log('[protocol]', request.method, url.pathname);
    }

    if (url.host !== APP_HOST) {
      return new Response('Not found', { status: 404 });
    }

    if (url.pathname.startsWith('/api/flexkit/')) {
      const response = await handleApi(request);

      if (process.env.FLEXKIT_DEBUG_PROTOCOL) {
        console.log('[protocol]', response.status, url.pathname);
      }

      return response;
    }

    if (devServerUrl) {
      // Vite answers with the page for paths that are not files (SPA fallback).
      // Node's fetch, not Chromium's: the unbundled Studio is hundreds of modules at once.
      // The path is set on the dev server's URL, never resolved against it: a
      // `//host` path would otherwise point at another host.
      const target = new URL(devServerUrl);

      target.pathname = url.pathname;
      target.search = url.search;

      return forward(() =>
        fetch(target.toString(), {
          method: 'GET',
          headers: { Accept: request.headers.get('accept') ?? '*/*' },
        })
      );
    }

    const requested = normalize(join(rendererDir, decodeURIComponent(url.pathname)));

    if (requested.startsWith(root) && (await isFile(requested))) {
      return serveFile(requested, requested.includes(`${sep}assets${sep}`));
    }

    // A missing file is a 404; only route paths (no extension) get the page.
    if (extname(url.pathname) !== '') {
      return new Response('Not found', { status: 404 });
    }

    return serveFile(join(rendererDir, 'index.html'), false);
  });
}
