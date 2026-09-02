import { createFlexkitApiHandler } from '@flexkit/studio/nextjs';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { forecasting } from '../../../../lib/flexkit-skills/forecasting';
import { ping } from '../../../../lib/flexkit-tools/ping';

const flexkitHandler = createFlexkitApiHandler(
  {
    NextResponse,
    cookies,
    headers,
  },
  {
    projectId: 'abcdefghij',
    skills: [forecasting],
    tools: [ping],
  }
);

export const runtime = 'nodejs';

export const { GET, POST, PUT, PATCH, DELETE } = flexkitHandler;
