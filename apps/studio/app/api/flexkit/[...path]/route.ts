import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Catch-all endpoint to re-route API requests to Flexkit.
 * The first-party auth cookie is grabbed and sent along as a bearer token.
 */

// TODO: This should be simplified by importing some function from @flexkit/studio that abstracts away most of this
export const runtime = 'edge';
const domain = 'api.flexkit.io';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  const token = cookieStore.get('sessionToken')?.value ?? '';
  const { pathname, search } = request.nextUrl;
  const [, , , projectId] = pathname.split('/');
  const apiUrl = `https://${projectId}.${domain}`;
  const path = pathname.replace(`/api/flexkit/${projectId}`, '');

  const response = await fetch(`${apiUrl}${path}${search}`, {
    headers: {
      Accept: 'application/json',
      Authorization: token,
      'Content-Type': 'application/json',
    },
  });
  const { status } = response;
  const jsonData = await response.json();

  return NextResponse.json(jsonData, { status });
}

async function handler(request: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  const token = cookieStore.get('sessionToken')?.value ?? '';
  const { pathname, search } = request.nextUrl;
  const [, , , projectId] = pathname.split('/');
  const apiUrl = `https://${projectId}.${domain}`;
  const path = pathname.replace(`/api/flexkit/${projectId}`, '');
  let body;

  try {
    const payload = await request.json();
    body = payload && JSON.stringify(payload);
  } catch (error) {
    body = undefined;
  }

  const response = await fetch(`${apiUrl}${path}${search}`, {
    headers: {
      Accept: 'application/json',
      Authorization: token,
      'Content-Type': 'application/json',
    },
    method: request.method,
    body,
  });
  const { status } = response;

  if (status === 204) {
    return NextResponse.json({ status });
  }

  const jsonData = await response.json();

  return NextResponse.json(jsonData, { status });
}

export { handler as DELETE, handler as PATCH, handler as POST, handler as PUT };
