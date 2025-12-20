import { handleFlexkitRequest, type FlexkitHandlerResult } from './core-handler';

/**
 * Types for Hono context
 * These are minimal types to avoid requiring hono as a dependency
 */
interface HonoContext {
  req: {
    raw: Request;
    header: (name: string) => string | undefined;
  };
  json: (data: unknown, status?: number) => Response;
  text: (data: string, status?: number) => Response;
  redirect: (location: string, status?: number) => Response;
  header: (name: string, value: string) => void;
}

type HonoHandler = (c: HonoContext) => Promise<Response>;

/**
 * Parses cookie value from cookie header string
 */
function getCookieValue(cookieHeader: string | undefined, name: string): string {
  if (!cookieHeader) {
    return '';
  }

  const cookies = cookieHeader.split(';').map((c) => c.trim());

  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.split('=');

    if (cookieName === name) {
      return rest.join('=');
    }
  }

  return '';
}

/**
 * Converts a FlexkitHandlerResult to a Response with proper headers
 */
function resultToResponse(result: FlexkitHandlerResult, c: HonoContext): Response {
  if (result.setCookie) {
    c.header('Set-Cookie', result.setCookie);
  }

  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      c.header(key, value);
    }
  }

  if (result.type === 'redirect') {
    return c.redirect(result.headers?.Location ?? '/', result.status);
  }

  if (result.type === 'text') {
    return c.text(result.body as string, result.status);
  }

  return c.json(result.body, result.status);
}

/**
 * Creates a Hono handler for Flexkit integration.
 *
 * Works with Hono in various environments:
 * - Node.js
 * - Bun
 * - Deno
 * - Cloudflare Workers
 * - Vercel Edge Functions
 * - AWS Lambda
 *
 * @example
 * ```ts
 * // server.ts
 * import { Hono } from 'hono';
 * import { createFlexkitHonoHandler } from '@flexkit/studio/hono';
 *
 * const app = new Hono();
 *
 * app.all('/api/flexkit/*', createFlexkitHonoHandler());
 *
 * export default app;
 * ```
 *
 * With Vite (using @hono/vite-dev-server):
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import devServer from '@hono/vite-dev-server';
 *
 * export default defineConfig({
 *   plugins: [
 *     devServer({
 *       entry: 'server.ts',
 *     }),
 *   ],
 * });
 * ```
 */
export function createFlexkitHonoHandler(): HonoHandler {
  return async (c: HonoContext): Promise<Response> => {
    const request = c.req.raw;
    const url = new URL(request.url);
    const cookieHeader = c.req.header('cookie');
    const sessionToken = getCookieValue(cookieHeader, 'sessionToken');

    const result = await handleFlexkitRequest({
      request,
      pathname: url.pathname,
      search: url.search,
      sessionToken,
      contentType: c.req.header('content-type') ?? null,
    });

    return resultToResponse(result, c);
  };
}
