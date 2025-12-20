import { handleFlexkitRequest, type FlexkitHandlerResult } from './core-handler';

/**
 * Types for Express request/response
 * Using minimal types to avoid requiring express as a dependency
 */
interface ExpressRequest {
  method: string;
  protocol: string;
  originalUrl: string;
  path: string;
  body?: unknown;
  cookies?: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  get: (name: string) => string | undefined;
}

interface ExpressResponse {
  status: (code: number) => ExpressResponse;
  json: (data: unknown) => void;
  send: (data: string) => void;
  redirect: (status: number, url: string) => void;
  setHeader: (name: string, value: string) => void;
  set: (name: string, value: string) => void;
}

type ExpressNextFunction = (err?: unknown) => void;

type ExpressHandler = (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => Promise<void>;

/**
 * Applies the result to an Express response
 */
function applyResultToResponse(result: FlexkitHandlerResult, res: ExpressResponse): void {
  if (result.setCookie) {
    res.setHeader('Set-Cookie', result.setCookie);
  }

  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      if (key !== 'Location') {
        res.setHeader(key, value);
      }
    }
  }

  if (result.type === 'redirect') {
    res.redirect(result.status, result.headers?.Location ?? '/');

    return;
  }

  if (result.type === 'text') {
    res.status(result.status).send(result.body as string);

    return;
  }

  res.status(result.status).json(result.body);
}

/**
 * Creates an Express middleware/handler for Flexkit integration.
 *
 * Note: Requires `cookie-parser` and `express.json()` middleware to be configured.
 *
 * @example
 * ```ts
 * // server.ts
 * import express from 'express';
 * import cookieParser from 'cookie-parser';
 * import { createFlexkitExpressHandler } from '@flexkit/studio/express';
 *
 * const app = express();
 *
 * // Required middleware
 * app.use(cookieParser());
 * app.use(express.json());
 *
 * // Mount the Flexkit handler
 * app.all('/api/flexkit/*', createFlexkitExpressHandler());
 *
 * app.listen(3000);
 * ```
 */
export function createFlexkitExpressHandler(): ExpressHandler {
  return async (req: ExpressRequest, res: ExpressResponse, _next: ExpressNextFunction): Promise<void> => {
    const protocol = req.protocol;
    const host = req.get('host') ?? 'localhost';
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;
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

    // Create a standard Request object
    const contentType = req.get('content-type') ?? null;
    let body: string | undefined;

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const request = new Request(fullUrl, {
      method: req.method,
      headers,
      body,
    });

    const result = await handleFlexkitRequest({
      request,
      pathname: req.path,
      search: url.search,
      sessionToken: req.cookies?.sessionToken ?? '',
      contentType,
    });

    applyResultToResponse(result, res);
  };
}
