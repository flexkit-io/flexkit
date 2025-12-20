import { createFlexkitApiHandler } from '@flexkit/studio/nextjs';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

const flexkitHandler = createFlexkitApiHandler({
  NextResponse,
  cookies,
  headers,
});

export const runtime = 'edge';

export const { GET, POST, PUT, PATCH, DELETE } = flexkitHandler;
