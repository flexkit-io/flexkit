import { handleFlexkitRequest, type FlexkitHandlerResult } from './core-handler';

/**
 * Types for Astro API context
 */
interface AstroCookies {
  get: (name: string) => { value: string } | undefined;
}

interface AstroAPIContext {
  request: Request;
  cookies: AstroCookies;
}

type AstroAPIRoute = (context: AstroAPIContext) => Promise<Response>;

/**
 * Converts a FlexkitHandlerResult to a standard Response
 */
function resultToResponse(result: FlexkitHandlerResult): Response {
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

  headers.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}

/**
 * Creates an Astro API route handler for Flexkit integration.
 *
 * @example
 * ```ts
 * // src/pages/api/flexkit/[...path].ts
 * import { createFlexkitAstroHandler } from '@flexkit/studio/astro';
 *
 * const handler = createFlexkitAstroHandler();
 *
 * export const GET = handler;
 * export const POST = handler;
 * export const PUT = handler;
 * export const PATCH = handler;
 * export const DELETE = handler;
 * ```
 *
 * Or using the prerender option:
 *
 * @example
 * ```ts
 * // src/pages/api/flexkit/[...path].ts
 * import { createFlexkitAstroHandler } from '@flexkit/studio/astro';
 *
 * export const prerender = false;
 *
 * const handler = createFlexkitAstroHandler();
 *
 * export const ALL = handler;
 * ```
 */
export function createFlexkitAstroHandler(): AstroAPIRoute {
  return async (context: AstroAPIContext): Promise<Response> => {
    const { request, cookies } = context;
    const url = new URL(request.url);

    const result = await handleFlexkitRequest({
      request,
      pathname: url.pathname,
      search: url.search,
      sessionToken: cookies.get('sessionToken')?.value ?? '',
      contentType: request.headers.get('content-type'),
    });

    return resultToResponse(result);
  };
}

/**
 * Alternative: Direct handler function for Astro API routes.
 * Use this if you prefer not to use the factory pattern.
 *
 * @example
 * ```ts
 * // src/pages/api/flexkit/[...path].ts
 * import { handleFlexkitAstroRequest } from '@flexkit/studio/astro';
 *
 * export const prerender = false;
 *
 * export const GET = handleFlexkitAstroRequest;
 * export const POST = handleFlexkitAstroRequest;
 * export const PUT = handleFlexkitAstroRequest;
 * export const PATCH = handleFlexkitAstroRequest;
 * export const DELETE = handleFlexkitAstroRequest;
 * ```
 */
export async function handleFlexkitAstroRequest(context: AstroAPIContext): Promise<Response> {
  const handler = createFlexkitAstroHandler();

  return handler(context);
}
