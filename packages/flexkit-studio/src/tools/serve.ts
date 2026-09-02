import type { FlexkitHandlerResult } from '../auth/core-handler';
import { parseCustomerToolActor } from './actor';
import { toolToManifest } from './define-tool';
import {
  CUSTOMER_TOOLS_SERVE_PATH,
  FLEXKIT_SIGNATURE_HEADER,
  FLEXKIT_SIGNATURE_PREVIOUS_HEADER,
  FLEXKIT_TIMESTAMP_HEADER,
  getHeader,
  verifySignedHeaders,
} from './hmac';
import type { CustomerToolsExecuteRequest, FlexkitSkill, FlexkitTool } from './types';

function jsonResult(status: number, body: unknown): FlexkitHandlerResult {
  return {
    body,
    headers: { 'Content-Type': 'application/json' },
    status,
    type: 'json',
  };
}

function getToolsSecrets(): string[] {
  const env = (globalThis as { process?: { env?: { [key: string]: string | undefined } } }).process?.env ?? {};
  const secrets: string[] = [];

  for (const value of [env.FLEXKIT_TOOLS_SECRET, env.FLEXKIT_TOOLS_SECRET_PREVIOUS]) {
    const trimmed = value?.trim() ?? '';

    if (trimmed && !secrets.includes(trimmed)) {
      secrets.push(trimmed);
    }
  }

  return secrets;
}

async function readRequestBody(request: Request): Promise<string> {
  try {
    return await request.text();
  } catch {
    return '';
  }
}

export async function handleCustomerToolsRequest({
  request,
  skills,
  tools,
}: {
  request: Request;
  skills?: FlexkitSkill[];
  tools: FlexkitTool[];
}): Promise<FlexkitHandlerResult> {
  const secrets = getToolsSecrets();

  if (secrets.length === 0) {
    return jsonResult(503, { error: 'FLEXKIT_TOOLS_SECRET is not configured.' });
  }

  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? '' : await readRequestBody(request);
  let pathname = CUSTOMER_TOOLS_SERVE_PATH;

  try {
    ({ pathname } = new URL(request.url));
  } catch {
    pathname = CUSTOMER_TOOLS_SERVE_PATH;
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
    return jsonResult(401, { error: 'Invalid Flexkit tools signature.' });
  }

  if (method === 'GET') {
    return jsonResult(200, {
      ...(skills === undefined ? {} : { skills }),
      tools: tools.map((tool) => toolToManifest(tool)),
    });
  }

  if (method !== 'POST') {
    return jsonResult(405, { error: 'Method not allowed.' });
  }

  let payload: CustomerToolsExecuteRequest;

  try {
    payload = JSON.parse(body) as CustomerToolsExecuteRequest;
  } catch {
    return jsonResult(400, { error: 'Invalid JSON body.' });
  }

  if (!payload.name || typeof payload.name !== 'string') {
    return jsonResult(400, { error: 'Tool name is required.' });
  }

  const actor = parseCustomerToolActor(payload.actor);

  if (!actor) {
    return jsonResult(400, { error: 'A valid Flexkit actor is required.' });
  }

  const tool = tools.find((candidate) => candidate.name === payload.name);

  if (!tool) {
    return jsonResult(404, { error: `Unknown tool "${payload.name}".` });
  }

  const parsed = tool.input.safeParse(payload.arguments ?? {});

  if (!parsed.success) {
    return jsonResult(400, {
      error: 'Invalid tool arguments.',
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  try {
    const result = await tool.execute(parsed.data, actor);

    return jsonResult(200, { result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tool execution failed.';

    return jsonResult(500, { error: message });
  }
}

export function isCustomerToolsPath(pathname: string): boolean {
  return pathname === CUSTOMER_TOOLS_SERVE_PATH;
}
