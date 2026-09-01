import type { FlexkitHandlerResult } from '../auth/core-handler';
import { flexkitApiDomain } from '../core/domains';
import { parseCustomerToolActor, type CustomerToolActor } from './actor';
import { toolToManifest } from './define-tool';
import { CUSTOMER_TOOLS_HELLO_PATH, CUSTOMER_TOOLS_POLL_PATH, CUSTOMER_TOOLS_RESPOND_PATH } from './hmac';
import type { FlexkitTool } from './types';

export const CUSTOMER_TOOLS_TICK_PATH_SUFFIX = '/tools/dev-connect/tick';
export const CUSTOMER_TOOLS_ME_PATH = '/users/me';
export const FLEXKIT_STUDIO_RUNTIME_HEADER = 'Flexkit-Studio-Runtime';
export const FLEXKIT_STUDIO_RUNTIME_LOCAL = 'local';

const DEV_CONNECT_ROLES: { [role: string]: true } = {
  developer: true,
  owner: true,
};

interface PendingJob {
  actor: CustomerToolActor;
  arguments: { [key: string]: unknown };
  id: string;
  name: string;
}

function jsonResult(status: number, body: unknown): FlexkitHandlerResult {
  return {
    body,
    headers: { 'Content-Type': 'application/json' },
    status,
    type: 'json',
  };
}

export function shouldHandleDevConnectTick(): boolean {
  const env = (globalThis as { process?: { env?: { [key: string]: string | undefined } } }).process?.env ?? {};

  if (env.FLEXKIT_TOOLS_DEV_CONNECT === '1') {
    return true;
  }

  return env.NODE_ENV !== 'production';
}

export function isDevConnectRole(role: string | null | undefined): boolean {
  return Boolean(role && DEV_CONNECT_ROLES[role]);
}

function getProjectApiOrigin(projectId: string): string {
  return `https://${projectId}.${flexkitApiDomain}`;
}

function guessClientLabel(fallbackProjectId: string): string {
  const env = (globalThis as { process?: { env?: { [key: string]: string | undefined } } }).process?.env ?? {};
  const port = env.PORT ?? '3000';

  return `${env.npm_package_name ?? fallbackProjectId}@localhost:${port}`;
}

export function isCustomerToolsTickPath(pathname: string): boolean {
  return /^\/api\/flexkit\/[^/]+\/tools\/dev-connect\/tick$/.test(pathname);
}

export function getCustomerToolsTickPath(projectId: string): string {
  return `/api/flexkit/${projectId}/tools/dev-connect/tick`;
}

async function sessionFetch({
  body,
  method,
  path,
  projectId,
  sessionToken,
}: {
  body?: string;
  method: string;
  path: string;
  projectId: string;
  sessionToken: string;
}): Promise<Response> {
  const headers: { [name: string]: string } = {
    Cookie: `sessionToken=${sessionToken}`,
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${getProjectApiOrigin(projectId)}${path}`, {
    body,
    headers,
    method,
  });
}

let tickInFlight = false;

type CachedConnectDecision = 'allow' | 401 | 403;

const connectDecisions: { [key: string]: CachedConnectDecision } = {};

function connectDecisionKey(projectId: string, sessionToken: string): string {
  return `${sessionToken}\0${projectId}`;
}

function forgetConnectDecision({
  projectId,
  sessionToken,
}: {
  projectId: string;
  sessionToken: string;
}): void {
  delete connectDecisions[connectDecisionKey(projectId, sessionToken)];
}

function rememberConnectDecision({
  decision,
  projectId,
  sessionToken,
}: {
  decision: CachedConnectDecision;
  projectId: string;
  sessionToken: string;
}): void {
  connectDecisions[connectDecisionKey(projectId, sessionToken)] = decision;
}

function deniedDevConnectResult(status: number): FlexkitHandlerResult {
  if (status === 401) {
    return jsonResult(401, { error: 'Sign in to Studio to connect local tools.' });
  }

  return jsonResult(403, { error: 'Only owners and developers can connect local tools.' });
}

async function getDevConnectDenial({
  projectId,
  sessionToken,
}: {
  projectId: string;
  sessionToken: string;
}): Promise<FlexkitHandlerResult | null> {
  const cached = connectDecisions[connectDecisionKey(projectId, sessionToken)];

  if (cached === 'allow') {
    return null;
  }

  if (cached === 401 || cached === 403) {
    return deniedDevConnectResult(cached);
  }

  let meResponse: Response;

  try {
    meResponse = await sessionFetch({
      method: 'GET',
      path: CUSTOMER_TOOLS_ME_PATH,
      projectId,
      sessionToken,
    });
  } catch {
    return jsonResult(503, { error: 'Unable to verify Studio session for local tools.' });
  }

  if (meResponse.status === 401 || meResponse.status === 403) {
    rememberConnectDecision({ decision: meResponse.status, projectId, sessionToken });

    return deniedDevConnectResult(meResponse.status);
  }

  if (!meResponse.ok) {
    return jsonResult(503, { error: 'Unable to verify Studio session for local tools.' });
  }

  let payload: { role?: unknown } = {};

  try {
    payload = (await meResponse.json()) as { role?: unknown };
  } catch {
    return jsonResult(503, { error: 'Unable to verify Studio session for local tools.' });
  }

  const role = typeof payload.role === 'string' ? payload.role : '';

  if (isDevConnectRole(role)) {
    rememberConnectDecision({ decision: 'allow', projectId, sessionToken });

    return null;
  }

  rememberConnectDecision({ decision: 403, projectId, sessionToken });

  return deniedDevConnectResult(403);
}

async function executeJob({
  actor,
  job,
  projectId,
  sessionToken,
  tools,
}: {
  actor: CustomerToolActor;
  job: PendingJob;
  projectId: string;
  sessionToken: string;
  tools: FlexkitTool[];
}): Promise<void> {
  const tool = tools.find((candidate) => candidate.name === job.name);
  let body: string;

  if (!tool) {
    body = JSON.stringify({ error: `Unknown tool "${job.name}".`, jobId: job.id });
  } else {
    const parsed = tool.input.safeParse(job.arguments ?? {});

    if (!parsed.success) {
      body = JSON.stringify({
        error: parsed.error.issues.map((issue: { message: string }) => issue.message).join(', '),
        jobId: job.id,
      });
    } else {
      try {
        const result = await tool.execute(parsed.data, actor);
        body = JSON.stringify({ jobId: job.id, result });
      } catch (error) {
        body = JSON.stringify({
          error: error instanceof Error ? error.message : 'Tool execution failed.',
          jobId: job.id,
        });
      }
    }
  }

  await sessionFetch({
    body,
    method: 'POST',
    path: CUSTOMER_TOOLS_RESPOND_PATH,
    projectId,
    sessionToken,
  });
}

export async function handleDevConnectTick({
  projectId,
  sessionToken,
  tools,
}: {
  projectId: string;
  sessionToken: string;
  tools: FlexkitTool[];
}): Promise<FlexkitHandlerResult> {
  if (!shouldHandleDevConnectTick()) {
    return jsonResult(204, { ok: true });
  }

  if (!sessionToken) {
    return jsonResult(401, { error: 'Sign in to Studio to connect local tools.' });
  }

  if (!projectId || tools.length === 0) {
    return jsonResult(204, { ok: true });
  }

  const denial = await getDevConnectDenial({ projectId, sessionToken });

  if (denial) {
    return denial;
  }

  if (tickInFlight) {
    return jsonResult(204, { ok: true });
  }

  tickInFlight = true;

  const helloBody = JSON.stringify({
    clientLabel: guessClientLabel(projectId),
    tools: tools.map((tool) => toolToManifest(tool)),
  });

  try {
    const helloResponse = await sessionFetch({
      body: helloBody,
      method: 'POST',
      path: CUSTOMER_TOOLS_HELLO_PATH,
      projectId,
      sessionToken,
    });

    if (helloResponse.status === 401 || helloResponse.status === 403) {
      forgetConnectDecision({ projectId, sessionToken });

      return jsonResult(helloResponse.status, { error: 'Unable to register the local tools runtime.' });
    }

    if (!helloResponse.ok) {
      return jsonResult(helloResponse.status, { error: 'Unable to register the local tools runtime.' });
    }

    const pollResponse = await sessionFetch({
      method: 'GET',
      path: CUSTOMER_TOOLS_POLL_PATH,
      projectId,
      sessionToken,
    });

    if (pollResponse.status === 401 || pollResponse.status === 403) {
      forgetConnectDecision({ projectId, sessionToken });

      return jsonResult(pollResponse.status, { error: 'Unable to poll for local tool jobs.' });
    }

    if (pollResponse.status !== 200) {
      return jsonResult(pollResponse.status, { error: 'Unable to poll for local tool jobs.' });
    }

    const { job } = (await pollResponse.json()) as { job?: PendingJob | null };

    if (!job) {
      return jsonResult(200, { job: null });
    }

    const actor = parseCustomerToolActor(job.actor);

    if (!actor) {
      await sessionFetch({
        body: JSON.stringify({ error: 'A valid Flexkit actor is required.', jobId: job.id }),
        method: 'POST',
        path: CUSTOMER_TOOLS_RESPOND_PATH,
        projectId,
        sessionToken,
      });

      return jsonResult(200, { job: job.id });
    }

    await executeJob({ actor, job, projectId, sessionToken, tools });

    return jsonResult(200, { job: job.id });
  } catch {
    return jsonResult(503, { error: 'Flexkit is not reachable from this local runtime.' });
  } finally {
    tickInFlight = false;
  }
}
