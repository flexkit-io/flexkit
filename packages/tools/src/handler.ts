import { parseCustomerToolActor } from './actor';
import { toolToManifest } from './define-tool';
import {
  FLEXKIT_SIGNATURE_HEADER,
  FLEXKIT_SIGNATURE_PREVIOUS_HEADER,
  FLEXKIT_TIMESTAMP_HEADER,
  getHeader,
  verifySignedHeaders,
} from './hmac';
import type { CustomerToolsExecuteRequest, FlexkitToolsDefinition } from './types';

export interface ToolsHandlerOptions {
  /** Previous signing secret, accepted during a rotation. Defaults to `FLEXKIT_TOOLS_SECRET_PREVIOUS`. */
  previousSecret?: string | null;
  /** Project signing secret from the Dashboard. Defaults to `FLEXKIT_TOOLS_SECRET`. */
  secret?: string | null;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function readEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: { [key: string]: string | undefined } } }).process?.env ?? {};

  return env[name];
}

function resolveSecrets(options: ToolsHandlerOptions): string[] {
  const secrets: string[] = [];

  for (const value of [options.secret ?? readEnv('FLEXKIT_TOOLS_SECRET'), options.previousSecret ?? readEnv('FLEXKIT_TOOLS_SECRET_PREVIOUS')]) {
    const trimmed = value?.trim() ?? '';

    if (trimmed && !secrets.includes(trimmed)) {
      secrets.push(trimmed);
    }
  }

  return secrets;
}

async function readBody(request: Request): Promise<string> {
  try {
    return await request.text();
  } catch {
    return '';
  }
}

/**
 * Serves a tools definition over the signed Flexkit contract: `GET` returns
 * the catalog, `POST` executes a tool. The signature covers the request path,
 * so register the exact URL this is mounted on as the project's tools URL.
 */
export async function handleToolsRequest(
  definition: FlexkitToolsDefinition,
  request: Request,
  options: ToolsHandlerOptions = {}
): Promise<Response> {
  const secrets = resolveSecrets(options);

  if (secrets.length === 0) {
    return json(503, { error: 'FLEXKIT_TOOLS_SECRET is not configured.' });
  }

  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? '' : await readBody(request);
  let pathname = '/';

  try {
    ({ pathname } = new URL(request.url));
  } catch {
    pathname = '/';
  }

  const verified = await verifySignedHeaders({
    body,
    method,
    path: pathname,
    previousSignatureHeader: getHeader(request.headers, FLEXKIT_SIGNATURE_PREVIOUS_HEADER),
    secret: secrets,
    signatureHeader: getHeader(request.headers, FLEXKIT_SIGNATURE_HEADER),
    timestampHeader: getHeader(request.headers, FLEXKIT_TIMESTAMP_HEADER),
  });

  if (!verified) {
    return json(401, { error: 'Invalid Flexkit tools signature.' });
  }

  if (method === 'GET') {
    return json(200, {
      skills: definition.skills,
      tools: definition.tools.map((tool) => toolToManifest(tool)),
    });
  }

  if (method !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  let payload: CustomerToolsExecuteRequest;

  try {
    payload = JSON.parse(body) as CustomerToolsExecuteRequest;
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  if (!payload.name || typeof payload.name !== 'string') {
    return json(400, { error: 'Tool name is required.' });
  }

  const actor = parseCustomerToolActor(payload.actor);

  if (!actor) {
    return json(400, { error: 'A valid Flexkit actor is required.' });
  }

  const tool = definition.tools.find((candidate) => candidate.name === payload.name);

  if (!tool) {
    return json(404, { error: `Unknown tool "${payload.name}".` });
  }

  const parsed = tool.input.safeParse(payload.arguments ?? {});

  if (!parsed.success) {
    return json(400, {
      error: 'Invalid tool arguments.',
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  try {
    const result = await tool.execute(parsed.data, actor);

    return json(200, { result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tool execution failed.';

    return json(500, { error: message });
  }
}

/**
 * Returns a `(request: Request) => Promise<Response>` handler for the tools
 * definition. Mount it on any HTTPS route: Next.js route handlers, Astro
 * endpoints, TanStack Start server routes, Hono, Vercel Functions, Workers.
 */
export function createToolsHandler(
  definition: FlexkitToolsDefinition,
  options: ToolsHandlerOptions = {}
): (_request: Request) => Promise<Response> {
  return (request) => handleToolsRequest(definition, request, options);
}
