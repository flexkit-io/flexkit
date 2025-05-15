import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';
import { getToken } from '@flexkit/studio/ssr';

/**
 * Catch-all endpoint to re-route API requests to Flexkit.
 * The first-party auth cookie is grabbed and sent along as a cookie.
 */

// TODO: This should be simplified by importing some function from @flexkit/studio that abstracts away most of this
export const runtime = 'edge';
const domain = 'api.flexkit.io';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  const headersList = headers();
  const sessionToken = cookieStore.get('sessionToken')?.value ?? '';
  const contentType = headersList.get('content-type');
  const { pathname, search } = request.nextUrl;
  const [, , , projectId] = pathname.split('/');
  const apiUrl = `https://${projectId}.${domain}`;
  const path = pathname.replace(`/api/flexkit/${projectId}`, '');

  // Handle get-token endpoint
  if (pathname === '/api/flexkit/get-token') {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') ?? '';
    const token = await getToken(code);
    const redirect = searchParams.get('redirect') ?? '/';

    return new NextResponse('Redirecting...', {
      status: 307,
      headers: {
        'Set-Cookie': `sessionToken=${token.sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000;`,
        Location: redirect,
      },
    });
  }

  // Handle logout endpoint
  if (pathname === '/api/flexkit/logout') {
    return new NextResponse('logging out...', {
      status: 307,
      headers: {
        'Set-Cookie': `sessionToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0;`,
        Location: '/',
      },
    });
  }

  const response = await fetch(`${apiUrl}${path}${search}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': contentType ?? 'application/json',
      Cookie: `sessionToken=${sessionToken}`,
    },
  });
  const { status } = response;
  const jsonData = await response.json();

  return NextResponse.json(jsonData, { status });
}

async function handler(request: NextRequest): Promise<NextResponse | Response> {
  const { pathname, search } = request.nextUrl;

  // Handle set-token endpoint
  if (pathname === '/api/flexkit/set-token') {
    const { searchParams } = new URL(request.url);
    const redirect = searchParams.get('redirect') ?? '/';
    let body: { sid: string };

    try {
      body = await request.json();
    } catch (error) {
      body = { sid: '' };
    }

    const { sid } = body;

    return new Response('Redirecting...', {
      status: 307,
      headers: {
        'Set-Cookie': `sessionToken=${sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000;`,
        Location: redirect,
      },
    });
  }

  // Regular API forwarding logic
  const cookieStore = cookies();
  const headersList = headers();
  const token = cookieStore.get('sessionToken')?.value ?? '';
  const contentType = headersList.get('content-type');
  const [, , , projectId] = pathname.split('/');
  const apiUrl = `https://${projectId}.${domain}`;
  const path = pathname.replace(`/api/flexkit/${projectId}`, '');
  let body;

  try {
    if (contentType === 'application/json') {
      const payload = await request.json();
      body = payload && JSON.stringify(payload);
    } else {
      // eslint-disable-next-line prefer-destructuring -- body is defined earlier
      body = request.body;
    }
  } catch (error) {
    body = undefined;
  }

  const response = await fetch(`${apiUrl}${path}${search}`, {
    headers: {
      'Content-Type': contentType ?? 'application/json',
      Cookie: `sessionToken=${token}`,
    },
    method: request.method,
    body,
  });
  const { status } = response;

  if (status === 204) {
    return NextResponse.json({ status });
  }

  if (response.headers.get('content-type')?.includes('text/plain')) {
    // Forward the response directly without consuming the body
    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }

  const jsonData = await response.json();

  return NextResponse.json(jsonData, { status });
}

export { handler as DELETE, handler as PATCH, handler as POST, handler as PUT };
