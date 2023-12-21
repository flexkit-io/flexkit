import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Catch-all endpoint to re-route API requests to Flexkit.
 * The first-party auth cookie is grabbed and sent along as a bearer token.
 */

export const runtime = 'edge';
// TODO: the projectId should be passed in as a parameter
const projectId = process.env.NEXT_PUBLIC_FLEXKIT_PROJECT_ID;
const domain = 'api.flexkit.io';
const apiUrl = `https://${projectId}.${domain}`;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  const token = cookieStore.get('sessionToken')?.value;
  const { pathname, search } = request.nextUrl;
  const path = pathname.replace('/api/flexkit', '');

  const response = await fetch(`${apiUrl}${path}${search}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `${token}`,
      'Content-Type': 'application/json',
    },
  });
  const { status } = response;
  const jsonData = await response.json();

  return NextResponse.json(jsonData, { status });
}

async function handler(request: NextRequest): Promise<NextResponse> {
  const cookieStore = cookies();
  const token = cookieStore.get('sessionToken')?.value;
  const { pathname, search } = request.nextUrl;
  const path = pathname.replace('/api', '');
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
      Authorization: `Bearer ${token}`,
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
