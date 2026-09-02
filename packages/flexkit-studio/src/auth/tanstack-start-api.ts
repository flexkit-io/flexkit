import { handleFlexkitRequest, type FlexkitHandlerOptions, type FlexkitHandlerResult } from './core-handler';
import { assertUniqueSkillNames } from '../tools/define-skill';

/**
 * Types for TanStack Start / Nitro / Vinxi event handling
 * These are minimal types compatible with H3 event objects used by Nitro
 */
interface H3Event {
  node: {
    req: {
      url?: string;
      method?: string;
      headers: Record<string, string | string[] | undefined>;
    };
    res: {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      end: (data?: string) => void;
    };
  };
  path: string;
  method: string;
}

type EventHandler = (event: H3Event) => Promise<unknown>;

/**
 * Parses cookie value from cookie header string
 */
function getCookieValue(cookieHeader: string | string[] | undefined, name: string): string {
  const header = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;

  if (!header) {
    return '';
  }

  const cookies = header.split(';').map((c) => c.trim());

  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.split('=');

    if (cookieName === name) {
      return rest.join('=');
    }
  }

  return '';
}

/**
 * Readable stream interface for Node.js request
 */
interface NodeReadableStream {
  on(event: 'data', listener: (chunk: Uint8Array) => void): void;
  on(event: 'end', listener: () => void): void;
  on(event: 'error', listener: (err: Error) => void): void;
}

/**
 * Reads the request body from an H3 event
 */
async function readBody(event: H3Event): Promise<string | undefined> {
  const req = event.node.req as unknown as NodeReadableStream;

  return new Promise((resolve) => {
    const decoder = new TextDecoder();
    let body = '';

    req.on('data', (chunk: Uint8Array) => {
      body += decoder.decode(chunk, { stream: true });
    });

    req.on('end', () => {
      body += decoder.decode();
      resolve(body.length === 0 ? undefined : body);
    });

    req.on('error', () => {
      resolve(undefined);
    });
  });
}

/**
 * Applies the result to an H3 response
 */
function applyResultToResponse(result: FlexkitHandlerResult, event: H3Event): string | object {
  const { res } = event.node;
  res.statusCode = result.status;

  if (result.setCookie) {
    res.setHeader('Set-Cookie', result.setCookie);
  }

  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, value);
    }
  }

  if (result.type === 'redirect') {
    return 'Redirecting...';
  }

  if (result.type === 'text') {
    res.setHeader('Content-Type', 'text/plain');

    return result.body as string;
  }

  res.setHeader('Content-Type', 'application/json');

  return result.body as object;
}

/**
 * Creates a TanStack Start / Nitro / Vinxi event handler for Flexkit integration.
 *
 * TanStack Start uses Nitro under the hood, which uses H3 for event handling.
 * This handler is compatible with the H3 event interface.
 *
 * @example
 * ```ts
 * // app/api/flexkit/[...path].ts (or .tsx)
 * import { createAPIFileRoute } from '@tanstack/react-start/api';
 * import { createFlexkitTanStackHandler } from '@flexkit/studio/tanstack-start';
 *
 * const handler = createFlexkitTanStackHandler();
 *
 * export const APIRoute = createAPIFileRoute('/api/flexkit/$')({
 *   GET: handler,
 *   POST: handler,
 *   PUT: handler,
 *   PATCH: handler,
 *   DELETE: handler,
 * });
 * ```
 *
 * Alternative using Nitro directly:
 *
 * @example
 * ```ts
 * // server/api/flexkit/[...path].ts
 * import { defineEventHandler } from 'h3';
 * import { createFlexkitTanStackHandler } from '@flexkit/studio/tanstack-start';
 *
 * export default defineEventHandler(createFlexkitTanStackHandler());
 * ```
 *
 * With Vinxi (Vite + Nitro):
 *
 * @example
 * ```ts
 * // app.config.ts
 * import { createApp } from 'vinxi';
 *
 * export default createApp({
 *   server: {
 *     // Your server configuration
 *   },
 * });
 *
 * // Then in your API route:
 * // server/api/flexkit/[...path].ts
 * import { eventHandler } from 'vinxi/http';
 * import { createFlexkitTanStackHandler } from '@flexkit/studio/tanstack-start';
 *
 * export default eventHandler(createFlexkitTanStackHandler());
 * ```
 */
export function createFlexkitTanStackHandler(options?: FlexkitHandlerOptions): EventHandler {
  assertUniqueSkillNames(options?.skills ?? []);

  return async (event: H3Event): Promise<unknown> => {
    const { req } = event.node;
    const method = event.method || req.method || 'GET';
    const host = (req.headers.host as string) || 'localhost';
    const protocol = 'https';
    const fullUrl = `${protocol}://${host}${req.url || event.path}`;
    const url = new URL(fullUrl);

    // Build headers for the standard Request
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      }
    }

    // Read body for non-GET requests
    let body: string | undefined;

    if (method !== 'GET' && method !== 'HEAD') {
      body = await readBody(event);
    }

    const contentType = (req.headers['content-type'] as string) || null;

    // Create a standard Request object
    const request = new Request(fullUrl, {
      method,
      headers,
      body,
    });

    const sessionToken = getCookieValue(req.headers.cookie, 'sessionToken');

    const result = await handleFlexkitRequest({
      request,
      pathname: url.pathname,
      search: url.search,
      sessionToken,
      contentType,
      options,
    });

    if (result.type === 'response') {
      const headers = new Headers(result.headers);

      if (result.setCookie) {
        headers.set('Set-Cookie', result.setCookie);
      }

      return new Response(result.body as BodyInit | null, { status: result.status, headers });
    }

    return applyResultToResponse(result, event);
  };
}

/**
 * Creates a Web-standard fetch handler for TanStack Start.
 * Use this when you need a handler that works with the Web Fetch API directly.
 *
 * @example
 * ```ts
 * // For use with TanStack Start's server functions or custom routing
 * import { createFlexkitFetchHandler } from '@flexkit/studio/tanstack-start';
 *
 * const handler = createFlexkitFetchHandler();
 *
 * // In your route handler:
 * export async function handleRequest(request: Request): Promise<Response> {
 *   return handler(request);
 * }
 * ```
 */
export function createFlexkitFetchHandler(options?: FlexkitHandlerOptions): (request: Request) => Promise<Response> {
  assertUniqueSkillNames(options?.skills ?? []);

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const cookieHeader = request.headers.get('cookie');

    let sessionToken = '';

    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map((c) => c.trim());

      for (const cookie of cookies) {
        const [name, ...rest] = cookie.split('=');

        if (name === 'sessionToken') {
          sessionToken = rest.join('=');
          break;
        }
      }
    }

    const result = await handleFlexkitRequest({
      request,
      pathname: url.pathname,
      search: url.search,
      sessionToken,
      contentType: request.headers.get('content-type'),
      options,
    });

    const headers = new Headers(result.headers);

    if (result.setCookie) {
      headers.set('Set-Cookie', result.setCookie);
    }

    if (result.type === 'redirect') {
      return new Response('Redirecting...', { status: result.status, headers });
    }

    if (result.type === 'text') {
      return new Response(result.body as string, { status: result.status, headers });
    }

    if (result.type === 'response') {
      return new Response(result.body as BodyInit | null, { status: result.status, headers });
    }

    headers.set('Content-Type', 'application/json');

    return new Response(JSON.stringify(result.body), { status: result.status, headers });
  };
}
