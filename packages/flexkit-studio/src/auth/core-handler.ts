import { getToken } from './get-token';

const domain = 'api.flexkit.io';

export interface FlexkitHandlerContext {
  request: Request;
  pathname: string;
  search: string;
  sessionToken: string;
  contentType: string | null;
}

export interface FlexkitHandlerResult {
  type: 'json' | 'redirect' | 'text';
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  setCookie?: string;
}

export async function handleFlexkitRequest(ctx: FlexkitHandlerContext): Promise<FlexkitHandlerResult> {
  const { request, pathname, search, sessionToken, contentType } = ctx;

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
  if (pathname === '/api/flexkit/set-token' && request.method === 'POST') {
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

  if (request.method !== 'GET' && request.method !== 'HEAD') {
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
        body = request.body;
      }
    } catch {
      body = undefined;
    }
  }

  const requestInit: RequestInit = {
    headers: {
      'Content-Type': forwardContentType,
      Cookie: `sessionToken=${sessionToken}`,
    },
    method: request.method,
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

  if (response.headers.get('content-type')?.includes('text/plain')) {
    const text = await response.text();

    return { type: 'text', status: response.status, body: text };
  }

  const jsonData = await response.json();

  return { type: 'json', status: response.status, body: jsonData };
}
