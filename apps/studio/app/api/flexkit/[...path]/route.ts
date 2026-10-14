import { createFlexkitApiHandler } from '@flexkit/studio/nextjs';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

// Studio BFF: session cookie, login code exchange and the proxy to the project
// and user-level Flexkit APIs. Same handler self-hosters use.
const flexkitHandler = createFlexkitApiHandler({
  NextResponse,
  cookies,
  headers,
});

export const runtime = 'nodejs';

export const { GET, POST, PUT, PATCH, DELETE } = flexkitHandler;
