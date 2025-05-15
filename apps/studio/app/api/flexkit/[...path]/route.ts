import { createFlexkitApiHandler } from '@flexkit/studio/ssr';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

const flexkitHandler = createFlexkitApiHandler({
  NextResponse,
  cookies,
  headers,
});

// Export the runtime configuration
export const { runtime } = flexkitHandler;

// Export all the HTTP methods handlers
export const { GET, POST, PUT, PATCH, DELETE } = flexkitHandler;
