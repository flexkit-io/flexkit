import { createFlexkitAstroHandler } from '@flexkit/studio/astro';

export const prerender = false;

const handler = createFlexkitAstroHandler();

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
