import type { FlexkitHandlerResult } from '../auth/core-handler';
import { flexkitApiDomain } from '../core/domains';
import { parseCustomerToolActor, type CustomerToolActor } from './actor';
import { toolToManifest } from './define-tool';
import { CUSTOMER_TOOLS_HELLO_PATH, CUSTOMER_TOOLS_POLL_PATH, CUSTOMER_TOOLS_RESPOND_PATH } from './hmac';
import type { FlexkitTool } from './types';

export const CUSTOMER_TOOLS_TICK_PATH_SUFFIX = '/tools/dev-connect/tick';
export const FLEXKIT_STUDIO_RUNTIME_HEADER = 'Flexkit-Studio-Runtime';
export const FLEXKIT_STUDIO_RUNTIME_LOCAL = 'local';

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

    if (!helloResponse.ok) {
      return jsonResult(helloResponse.status, { error: 'Unable to register the local tools runtime.' });
    }

    const pollResponse = await sessionFetch({
      method: 'GET',
      path: CUSTOMER_TOOLS_POLL_PATH,
      projectId,
      sessionToken,
    });

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
  }
}
