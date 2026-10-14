import { parseCustomerToolActor, type CustomerToolActor } from '../actor';
import { toolToManifest } from '../define-tool';
import { CUSTOMER_TOOLS_HELLO_PATH, CUSTOMER_TOOLS_POLL_PATH, CUSTOMER_TOOLS_RESPOND_PATH } from '../hmac';
import type { FlexkitTool, FlexkitToolsDefinition } from '../types';

export type DevConnectEvent =
  | { type: 'connected'; skillCount: number; toolCount: number }
  | { type: 'manifest-sent'; warnings: string[] }
  | { type: 'job-start'; id: string; name: string }
  | { type: 'job-done'; id: string; ms: number; name: string }
  | { type: 'job-error'; error: string; id: string; ms: number; name: string }
  | { type: 'denied'; message: string; status: number }
  | { type: 'unreachable'; message: string }
  | { type: 'stopped' };

export interface DevConnectOptions {
  /** Project API origin, e.g. `https://abcdefghij.api.flexkit.io`. */
  apiOrigin: string;
  /** Shown in the Dashboard next to the connection. */
  clientLabel: string;
  definition: FlexkitToolsDefinition;
  fetch?: typeof fetch;
  /** How often the catalog is re-advertised while unchanged. */
  helloIntervalMs?: number;
  onEvent?: (_event: DevConnectEvent) => void;
  /** Poll backoff bounds. Keep the maximum under the backend's 10 s liveness window. */
  pollIntervalMs?: { max: number; min: number };
  /** Studio session token of an owner or developer. API tokens are refused by the backend. */
  token: string;
}

export interface DevConnectHandle {
  /** Resolves once the loop has exited. */
  done: Promise<void>;
  stop: () => void;
  /** Re-advertise a new definition (for example after the tools file changed). */
  update: (_definition: FlexkitToolsDefinition) => void;
}

interface PendingJob {
  actor: CustomerToolActor;
  arguments: { [key: string]: unknown };
  id: string;
  name: string;
}

const DEFAULT_POLL_INTERVAL = { max: 5000, min: 2000 };
const DEFAULT_HELLO_INTERVAL_MS = 30_000;

function hashManifest(manifest: string): string {
  let hash = 2166136261;

  for (let index = 0; index < manifest.length; index += 1) {
    hash ^= manifest.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();

      return;
    }

    const timeout = setTimeout(done, ms);

    function done(): void {
      clearTimeout(timeout);
      signal.removeEventListener('abort', done);
      resolve();
    }

    signal.addEventListener('abort', done, { once: true });
  });
}

async function runTool(tools: FlexkitTool[], job: PendingJob): Promise<{ error?: string; result?: unknown }> {
  const tool = tools.find((candidate) => candidate.name === job.name);

  if (!tool) {
    return { error: `Unknown tool "${job.name}".` };
  }

  const actor = parseCustomerToolActor(job.actor);

  if (!actor) {
    return { error: 'A valid Flexkit actor is required.' };
  }

  const parsed = tool.input.safeParse(job.arguments ?? {});

  if (!parsed.success) {
    return { error: parsed.error.issues.map((issue: { message: string }) => issue.message).join(', ') };
  }

  try {
    return { result: await tool.execute(parsed.data, actor) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Tool execution failed.' };
  }
}

/**
 * Registers a local custom-tools runtime with Flexkit and executes the tool
 * calls queued for the signed-in developer: the loop behind `flexkit dev`.
 * Exported so other hosts (a desktop app, a dev server plugin) can offer the
 * same thing without the CLI.
 */
export function startDevConnect(options: DevConnectOptions): DevConnectHandle {
  const fetchImpl = options.fetch ?? fetch;
  const poll = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL;
  const helloIntervalMs = options.helloIntervalMs ?? DEFAULT_HELLO_INTERVAL_MS;
  const emit = options.onEvent ?? (() => undefined);
  const controller = new AbortController();
  const apiOrigin = options.apiOrigin.replace(/\/$/, '');
  let { definition } = options;
  let lastManifestHash = '';
  let lastHelloAt = 0;
  let connected = false;

  function request(path: string, init: { body?: string; method: string }): Promise<Response> {
    const headers: { [name: string]: string } = { Authorization: options.token };

    if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    return fetchImpl(`${apiOrigin}${path}`, { body: init.body, headers, method: init.method, signal: controller.signal });
  }

  function helloBody(): string {
    return JSON.stringify({
      clientLabel: options.clientLabel,
      skills: definition.skills,
      tools: definition.tools.map((tool) => toolToManifest(tool)),
    });
  }

  /** Returns false when the backend refused the runtime and the loop must end. */
  async function tick(): Promise<{ hadJob: boolean; ok: boolean }> {
    const body = helloBody();
    const manifestHash = hashManifest(body);

    if (manifestHash !== lastManifestHash || Date.now() - lastHelloAt >= helloIntervalMs) {
      const hello = await request(CUSTOMER_TOOLS_HELLO_PATH, { body, method: 'POST' });

      if (hello.status === 401 || hello.status === 403) {
        emit({
          message:
            hello.status === 401
              ? 'Sign in with `flexkit login` to connect a local runtime.'
              : 'Only owners and developers can connect a local runtime.',
          status: hello.status,
          type: 'denied',
        });

        return { hadJob: false, ok: false };
      }

      if (!hello.ok) {
        emit({ message: `Flexkit answered ${String(hello.status)} while registering the local runtime.`, type: 'unreachable' });

        return { hadJob: false, ok: true };
      }

      const manifestChanged = manifestHash !== lastManifestHash;
      lastManifestHash = manifestHash;
      lastHelloAt = Date.now();

      if (!connected) {
        connected = true;
        emit({ skillCount: definition.skills.length, toolCount: definition.tools.length, type: 'connected' });
      }

      if (manifestChanged) {
        let warnings: string[] = [];

        try {
          warnings = ((await hello.json()) as { warnings?: string[] }).warnings ?? [];
        } catch {
          warnings = [];
        }

        emit({ type: 'manifest-sent', warnings });
      }
    }

    const polled = await request(CUSTOMER_TOOLS_POLL_PATH, { method: 'GET' });

    if (polled.status === 401 || polled.status === 403) {
      emit({ message: 'Flexkit refused the local runtime session.', status: polled.status, type: 'denied' });

      return { hadJob: false, ok: false };
    }

    if (polled.status !== 200) {
      emit({ message: `Flexkit answered ${String(polled.status)} while polling for tool calls.`, type: 'unreachable' });

      return { hadJob: false, ok: true };
    }

    const { job } = (await polled.json()) as { job?: PendingJob | null };

    if (!job) {
      return { hadJob: false, ok: true };
    }

    emit({ id: job.id, name: job.name, type: 'job-start' });
    const startedAt = Date.now();
    const outcome = await runTool(definition.tools, job);
    const ms = Date.now() - startedAt;

    await request(CUSTOMER_TOOLS_RESPOND_PATH, {
      body: JSON.stringify({ jobId: job.id, ...outcome }),
      method: 'POST',
    });

    if (outcome.error === undefined) {
      emit({ id: job.id, ms, name: job.name, type: 'job-done' });
    } else {
      emit({ error: outcome.error, id: job.id, ms, name: job.name, type: 'job-error' });
    }

    return { hadJob: true, ok: true };
  }

  const done = (async () => {
    let delay = poll.min;

    while (!controller.signal.aborted) {
      let hadJob = false;

      try {
        const outcome = await tick();

        if (!outcome.ok) {
          break;
        }

        ({ hadJob } = outcome);
      } catch (error) {
        if (controller.signal.aborted) {
          break;
        }

        emit({ message: error instanceof Error ? error.message : 'Flexkit is not reachable.', type: 'unreachable' });
        lastManifestHash = '';
        connected = false;
      }

      delay = hadJob ? poll.min : Math.min(delay * 2, poll.max);

      if (hadJob) {
        continue;
      }

      await sleep(delay, controller.signal);
    }

    emit({ type: 'stopped' });
  })();

  return {
    done,
    stop: () => {
      controller.abort();
    },
    update: (next) => {
      definition = next;
    },
  };
}
