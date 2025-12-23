import { handleFlexkitRequest, type FlexkitHandlerResult } from './core-handler';

/**
 * Types for Next.js dependencies
 */
interface NextRequest {
  url: string;
  method: string;
  nextUrl: { pathname: string; search: string };
  json: () => Promise<unknown>;
  body: ReadableStream<Uint8Array> | null;
}

interface NextResponseStatic {
  json: (data: unknown, init?: { status?: number }) => Response;
  new (body: BodyInit | null, init?: ResponseInit): Response;
}

interface CookieStore {
  get: (name: string) => { value: string } | undefined;
}

interface HeadersList {
  get: (name: string) => string | null;
}

interface FlexkitNextDependencies {
  NextResponse: NextResponseStatic;
  cookies: () => Promise<CookieStore> | CookieStore;
  headers: () => Promise<HeadersList> | HeadersList;
}

/**
 * Converts a FlexkitHandlerResult to a Next.js Response
 */
function resultToNextResponse(result: FlexkitHandlerResult, NextResponse: NextResponseStatic): Response {
  const headers: Record<string, string> = { ...result.headers };

  if (result.setCookie) {
    headers['Set-Cookie'] = result.setCookie;
  }

  if (result.type === 'redirect') {
    return new NextResponse('Redirecting...', {
      status: result.status,
      headers,
    });
  }

  if (result.type === 'text') {
    return new NextResponse(result.body as string, {
      status: result.status,
      headers,
    });
  }

  return NextResponse.json(result.body, { status: result.status });
}

/**
 * Creates a Next.js API route handler for Flexkit integration.
 *
 * Compatible with Next.js versions 13, 14, 15, and 16.
 *
 * @param dependencies Next.js dependencies that should be passed from the app
 *
 * This function should be used in a Next.js app route handler:
 *
 * @example
 * ```ts
 * // app/api/flexkit/[...path]/route.ts
 * import { createFlexkitApiHandler } from '@flexkit/studio/nextjs';
 * import { NextResponse } from 'next/server';
 * import { cookies, headers } from 'next/headers';
 *
 * const flexkitHandler = createFlexkitApiHandler({
 *   NextResponse,
 *   cookies,
 *   headers,
 * });
 *
 * // Export the runtime configuration (optional, for edge runtime)
 * export const runtime = 'edge';
 *
 * // Export all the HTTP methods handlers
 * export const { GET, POST, PUT, PATCH, DELETE } = flexkitHandler;
 * ```
 */
export function createFlexkitApiHandler(dependencies: FlexkitNextDependencies) {
  const { NextResponse, cookies, headers } = dependencies;

  const handleRequest = async (request: NextRequest): Promise<Response> => {
    const cookieStore = await cookies();
    const headersList = await headers();
    const sessionToken = cookieStore.get('sessionToken')?.value ?? '';
    const contentType = headersList.get('content-type');
    const { pathname, search } = request.nextUrl;

    // Create a standard Request object from the Next.js request
    const standardRequest = new Request(request.url, {
      method: request.method,
      headers: {
        'Content-Type': contentType ?? 'application/json',
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      // @ts-expect-error - duplex is required for streaming bodies
      duplex: 'half',
    });

    const result = await handleFlexkitRequest({
      request: standardRequest,
      pathname,
      search,
      sessionToken,
      contentType,
    });

    return resultToNextResponse(result, NextResponse);
  };

  return {
    GET: handleRequest,
    POST: handleRequest,
    PUT: handleRequest,
    PATCH: handleRequest,
    DELETE: handleRequest,
    handler: handleRequest,
  };
}
