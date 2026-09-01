/**
 * Type definitions for the Next.js API handler
 */

interface FlexkitNextRequest {
  url: string;
  method: string;
  nextUrl: { pathname: string; search: string };
  json: () => Promise<unknown>;
  body: ReadableStream<Uint8Array> | null;
  headers: Headers;
}

export interface FlexkitApiHandler {
  GET: (request: FlexkitNextRequest) => Promise<Response>;
  handler: (request: FlexkitNextRequest) => Promise<Response>;
  DELETE: (request: FlexkitNextRequest) => Promise<Response>;
  PATCH: (request: FlexkitNextRequest) => Promise<Response>;
  POST: (request: FlexkitNextRequest) => Promise<Response>;
  PUT: (request: FlexkitNextRequest) => Promise<Response>;
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

/**
 * Dependencies needed from Next.js
 */
export interface NextJsDependencies {
  /**
   * The NextResponse class from next/server
   */
  NextResponse: NextResponseStatic;

  /**
   * The cookies function from next/headers
   */
  cookies: () => Promise<CookieStore> | CookieStore;

  /**
   * The headers function from next/headers
   */
  headers: () => Promise<HeadersList> | HeadersList;
}

/**
 * Creates a Next.js API route handler for Flexkit integration
 *
 * @param dependencies Next.js dependencies that should be passed from the app
 * @param options Optional custom tools registered on `/api/flexkit/tools`
 * @returns A handler object with all HTTP methods and runtime configuration
 */
export function createFlexkitApiHandler(
  dependencies: NextJsDependencies,
  options?: import('../tools/types').FlexkitHandlerOptions
): FlexkitApiHandler;
