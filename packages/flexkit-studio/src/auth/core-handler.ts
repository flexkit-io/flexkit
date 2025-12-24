import { getToken } from './get-token';

const domain = 'api.flexkit.io';

export interface FlexkitHandlerContext {
  request: Request;
  pathname: string;
  search: string;
  sessionToken: string;
  contentType: string | null;
}

type FlexkitHandlerHeaders = { [key: string]: string };

export type FlexkitHandlerResult =
  | {
      type: 'redirect';
      status: number;
      headers?: FlexkitHandlerHeaders;
      setCookie?: string;
    }
  | {
      type: 'text';
      status: number;
      body: string;
      headers?: FlexkitHandlerHeaders;
      setCookie?: string;
    }
  | {
      type: 'json';
      status: number;
      body: unknown;
      headers?: FlexkitHandlerHeaders;
      setCookie?: string;
    }
  | {
      type: 'response';
      status: number;
      body: BodyInit | null;
      headers?: FlexkitHandlerHeaders;
      setCookie?: string;
    };

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function sanitizeForwardHeaders(headers: Headers): Headers {
  const sanitized = new Headers();

  headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();

    if (hopByHopHeaders.has(normalizedKey)) {
      return;
    }

    if (normalizedKey === 'host') {
      return;
    }

    if (normalizedKey === 'content-length') {
      return;
    }

    if (normalizedKey === 'content-encoding') {
      return;
    }

    if (normalizedKey === 'accept-encoding') {
      return;
    }

    sanitized.set(key, value);
  });

  return sanitized;
}

function headersToObject(headers: Headers): { [key: string]: string } {
  const result: { [key: string]: string } = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

export async function handleFlexkitRequest(ctx: FlexkitHandlerContext): Promise<FlexkitHandlerResult> {
  const { request, pathname, search, sessionToken, contentType } = ctx;
  const { body: requestBody, method } = request;

  // Handle get-token endpoint
  if (pathname === '/api/flexkit/get-token') {
    const url = new URL(request.url);
    const code = url.searchParams.get('code') ?? '';
    const token = await getToken(code);
    const redirect = url.searchParams.get('redirect') ?? '/';

    return {
      type: 'redirect',
      status: 307,
      headers: { Location: redirect },
      setCookie: `sessionToken=${token.sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000;`,
    };
  }

  // Handle logout endpoint
  if (pathname === '/api/flexkit/logout') {
    return {
      type: 'redirect',
      status: 307,
      headers: { Location: '/' },
      setCookie: `sessionToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0;`,
    };
  }

  // Handle set-token endpoint
  if (pathname === '/api/flexkit/set-token' && method === 'POST') {
    const url = new URL(request.url);
    const redirect = url.searchParams.get('redirect') ?? '/';
    let sid = '';

    try {
      const body = (await request.json()) as { sid?: string };
      sid = body.sid ?? '';
    } catch {
      sid = '';
    }

    return {
      type: 'redirect',
      status: 307,
      headers: { Location: redirect },
      setCookie: `sessionToken=${sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000;`,
    };
  }

  // Regular API proxy
  const [, , , projectId] = pathname.split('/');
  const apiUrl = `https://${projectId}.${domain}`;
  const path = pathname.replace(`/api/flexkit/${projectId}`, '');

  let body: string | ReadableStream<Uint8Array> | null | undefined;
  let forwardContentType = contentType ?? 'application/json';

  if (method !== 'GET' && method !== 'HEAD') {
    const normalizedContentType = (contentType ?? '').toLowerCase();
    const isJson = normalizedContentType.includes('application/json');
    const isTextPlain = normalizedContentType.startsWith('text/plain');

    try {
      if (isJson || isTextPlain || !contentType) {
        const text = await request.text();
        const trimmed = text.trim();

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          body = trimmed;
          forwardContentType = 'application/json';
        } else {
          body = text;
          forwardContentType = contentType ?? 'text/plain';
        }
      } else {
        body = requestBody;
      }
    } catch {
      body = undefined;
    }
  }

  const forwardHeaders = sanitizeForwardHeaders(request.headers);

  if (sessionToken) {
    forwardHeaders.set('Cookie', `sessionToken=${sessionToken}`);
  } else {
    forwardHeaders.delete('Cookie');
  }

  if (method !== 'GET' && method !== 'HEAD') {
    forwardHeaders.set('Content-Type', forwardContentType);
  }

  const requestInit: RequestInit = {
    headers: forwardHeaders,
    method,
    body,
  };

  if (body && typeof body !== 'string') {
    // @ts-expect-error - duplex is required for streaming bodies in Node.js fetch
    requestInit.duplex = 'half';
  }

  const response = await fetch(`${apiUrl}${path}${search}`, requestInit);

  if (response.status === 204) {
    return { type: 'json', status: 204, body: { status: 204 } };
  }

  const responseHeaders = sanitizeForwardHeaders(response.headers);

  return {
    type: 'response',
    status: response.status,
    body: response.body,
    headers: headersToObject(responseHeaders),
  };
}
