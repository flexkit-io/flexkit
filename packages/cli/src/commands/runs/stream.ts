import chalk from 'chalk';
import type Client from '../../util/client';
import responseError from '../../util/error-utils';
import { readEventStream, parseEventJson } from '../../util/sse';
import { truncate } from '../../util/output/format';
import sleep from '../../util/sleep';
import type { AutomationRun, AutomationRunStatus } from '../automations/types';

/** A UI message stream chunk as the run stream sends it (AI SDK `UIMessageChunk` plus Flexkit `data-*` parts). */
export interface RunStreamChunk {
  type: string;
  [key: string]: unknown;
}

/** One frame of the indexed (`wire=2`) run stream. */
export interface RunStreamFrame {
  index: number;
  chunk: RunStreamChunk | null;
}

export const TERMINAL_RUN_STATUSES: AutomationRunStatus[] = ['success', 'failed', 'cancelled', 'skipped'];

export function isTerminalRunStatus(status: string): boolean {
  return (TERMINAL_RUN_STATUSES as string[]).includes(status);
}

/** The durable `finish` chunk the backend writes when a run closes (a pause ends the HTTP stream without it). */
export function isTerminalFinish(chunk: RunStreamChunk | null): boolean {
  if (chunk?.type !== 'finish') {
    return false;
  }

  const metadata = chunk.messageMetadata as { flexkitTerminal?: boolean } | undefined;

  return metadata?.flexkitTerminal === true;
}

/** Path of the indexed run stream, resumable from `startIndex`. */
export function runStreamPath(workflowRunId: string, startIndex: number): string {
  return `/automations/runs/${encodeURIComponent(workflowRunId)}/stream?wire=2&startIndex=${startIndex.toString()}`;
}

function stringify(value: unknown, max: number): string {
  if (value === undefined) {
    return '';
  }

  let text: string;

  try {
    text = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    text = String(value);
  }

  return truncate(text, max);
}

function getText(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .map((part: unknown) => {
      const record = part as { type?: unknown; text?: unknown } | null;

      return record?.type === 'text' && typeof record.text === 'string' ? record.text : '';
    })
    .join('');
}

/**
 * Turns run stream chunks into readable terminal text: the agent's text as it
 * streams, one line per tool call and result, approval pauses, errors and the
 * final status. Returns '' for chunks that have nothing to show.
 */
export function createRunEventRenderer(): (chunk: RunStreamChunk) => string {
  const toolNames = new Map<string, string>();
  let atLineStart = true;
  // The text the agent streamed, so the closing summary isn't printed twice.
  let streamedText = '';

  const line = (text: string): string => {
    const prefix = atLineStart ? '' : '\n';
    atLineStart = true;

    return `${prefix}${text}\n`;
  };

  return (chunk: RunStreamChunk): string => {
    const data = (chunk.data ?? {}) as Record<string, unknown>;
    const toolCallId = typeof chunk.toolCallId === 'string' ? chunk.toolCallId : '';

    switch (chunk.type) {
      case 'text-delta': {
        const delta = typeof chunk.delta === 'string' ? chunk.delta : '';

        if (delta) {
          atLineStart = delta.endsWith('\n');
          streamedText += delta;
        }

        return delta;
      }

      case 'text-end':
        if (atLineStart) {
          return '';
        }

        atLineStart = true;

        return '\n';

      case 'tool-input-start':
        if (typeof chunk.toolName === 'string') {
          toolNames.set(toolCallId, chunk.toolName);
        }

        return '';

      case 'tool-input-available': {
        const name = typeof chunk.toolName === 'string' ? chunk.toolName : (toolNames.get(toolCallId) ?? 'tool');
        toolNames.set(toolCallId, name);
        const input = stringify(chunk.input, 100);

        return line(chalk.cyan(`→ ${name}`) + (input ? chalk.dim(` ${input}`) : ''));
      }

      case 'tool-output-available': {
        const name = toolNames.get(toolCallId) ?? 'tool';

        return line(chalk.dim(`  ✓ ${name} ${stringify(chunk.output, 80)}`.trimEnd()));
      }

      case 'tool-output-error':
      case 'tool-input-error': {
        const name = toolNames.get(toolCallId) ?? (typeof chunk.toolName === 'string' ? chunk.toolName : 'tool');

        return line(chalk.red(`  ✗ ${name}: ${typeof chunk.errorText === 'string' ? chunk.errorText : 'failed'}`));
      }

      case 'error':
        return line(chalk.red(`Error: ${typeof chunk.errorText === 'string' ? chunk.errorText : 'unknown error'}`));

      case 'data-user-message': {
        const text = getText(data.parts);

        return text ? line(chalk.dim(`Input: ${truncate(text, 200)}`)) : '';
      }

      case 'data-load-skill':
        return typeof data.skillName === 'string' && data.status === 'done'
          ? line(chalk.dim(`Loaded skill ${data.skillName}`))
          : '';

      case 'data-mutation-approval':
        return data.status === 'pending' && typeof data.approvalId === 'string'
          ? line(
              chalk.yellow(
                `⏸ Waiting for approval ${data.approvalId}${
                  typeof data.operationsSummary === 'string' ? `: ${data.operationsSummary}` : ''
                }`
              )
            )
          : '';

      case 'data-run-summary': {
        const status = typeof data.status === 'string' ? data.status : '';
        const color = status === 'success' ? chalk.green : status === 'failed' ? chalk.red : chalk.yellow;
        const text = typeof data.summary === 'string' ? data.summary.trim() : '';
        const summary = text && !streamedText.includes(text) ? `\n${text}` : '';

        return line(`${color(`● Run ${status || 'finished'}`)}${summary}`);
      }

      default:
        return '';
    }
  };
}

async function getRun(client: Client, projectId: string, runId: string): Promise<AutomationRun> {
  const { run } = await client.fetch<{ run: AutomationRun }>(`/automations/runs/${encodeURIComponent(runId)}`, {
    projectId,
  });

  return run;
}

export interface StreamRunOptions {
  /** Keep waiting through approval pauses until the run ends. */
  follow: boolean;
  /** Print raw chunks as NDJSON instead of rendered text. */
  json: boolean;
}

/**
 * Prints a run's events from the indexed stream. Without `follow` it stops
 * when the stream ends (a finished run, or a run that paused for approval);
 * with `follow` it reconnects from the last index until the run finishes.
 * Returns the run as it is when streaming stops.
 */
export async function streamRun(
  client: Client,
  projectId: string,
  initial: AutomationRun,
  { follow, json }: StreamRunOptions
): Promise<AutomationRun> {
  const { output } = client;
  let run = initial;

  if (!run.workflowRunId) {
    output.warn('This run has no event stream (it was skipped before the agent started).');

    return run;
  }

  const { workflowRunId } = run;
  const render = createRunEventRenderer();
  let cursor = 0;
  let failures = 0;
  let announcedPause = false;

  for (;;) {
    let complete = false;

    try {
      const response = await client.rawFetch(runStreamPath(workflowRunId, cursor), { projectId });

      if (response.status === 404) {
        await response.body?.cancel();
        output.warn('The event stream of this run is no longer available.');

        return getRun(client, projectId, run.id);
      }

      if (!response.ok) {
        throw await responseError(response);
      }

      if (response.headers.get('x-flexkit-stream-version') !== '2') {
        await response.body?.cancel();
        throw new Error('This Flexkit server does not support resumable run streams yet.');
      }

      for await (const event of readEventStream(response)) {
        const frame = parseEventJson<RunStreamFrame>(event);

        if (!frame || !Number.isSafeInteger(frame.index) || frame.index < cursor) {
          continue;
        }

        cursor = frame.index + 1;
        failures = 0;

        if (frame.chunk) {
          client.stdout.write(json ? `${JSON.stringify(frame.chunk)}\n` : render(frame.chunk));
        }

        if (isTerminalFinish(frame.chunk)) {
          complete = true;
          break;
        }
      }
    } catch (err: unknown) {
      // 4xx answers are final; dropped connections are retried from the cursor.
      const { status } = err as { status?: number };
      const isClientError = status !== undefined && status >= 400 && status < 500;

      if (isClientError || ++failures >= 5) {
        throw err;
      }

      output.debug(`Run stream dropped, reconnecting: ${err instanceof Error ? err.message : String(err)}`);
    }

    run = await getRun(client, projectId, run.id);

    if (complete || isTerminalRunStatus(run.status)) {
      return run;
    }

    if (run.status === 'awaiting_approval') {
      if (!follow) {
        return run;
      }

      if (!announcedPause) {
        output.log('The run is waiting for approval; still following…');
        announcedPause = true;
      }
    } else {
      announcedPause = false;
    }

    await sleep(2000);
  }
}

/** Polls a run until it finishes, waiting through approval pauses. */
export async function waitForRun(client: Client, projectId: string, runId: string): Promise<AutomationRun> {
  let announcedPause = false;

  for (;;) {
    const run = await getRun(client, projectId, runId);

    if (isTerminalRunStatus(run.status)) {
      return run;
    }

    if (run.status === 'awaiting_approval' && !announcedPause) {
      client.output.stopSpinner();
      client.output.log('The run is waiting for approval. Approve it with `flexkit approvals ls` / `approve <id>`.');
      client.output.spinner('Waiting for the run to finish');
      announcedPause = true;
    }

    await sleep(2000);
  }
}

export { getRun };
