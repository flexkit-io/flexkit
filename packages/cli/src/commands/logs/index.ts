import chalk from 'chalk';
import type Client from '../../util/client';
import { runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import { printJson, printTable } from '../../util/output/format';
import { getCommandName } from '../../util/pkg';
import { isAPIError } from '../../util/error-utils';
import { logsApiCommand, logsCommand, logsLlmCommand, logsWebhooksCommand } from './command';
import {
  HEADERS,
  buildLogsQuery,
  isErrorEntry,
  logEntryRow,
  parseTimeArg,
  pruneSeen,
  takeNewEntries,
  type LogEntry,
  type LogType,
  type LogsQueryOptions,
  type LogsResponse,
} from './format';

const DEFAULT_LIMIT = 50;
const DEFAULT_SINCE = '1h';
/** Each poll looks back this far past the previous one, for entries that land late. */
const FOLLOW_OVERLAP_MS = 30_000;

const LOG_FLAGS = {
  '--since': String,
  '-s': '--since',
  '--until': String,
  '--before': String,
  '--limit': Number,
  '-n': '--limit',
  '--follow': Boolean,
  '-f': '--follow',
  '--interval': Number,
  '--utc': Boolean,
};

function colorRow(entry: LogEntry, row: string[]): string[] {
  const statusIndex = entry.type === 'llm-requests' ? -1 : 2;

  return row.map((cell, index) => {
    if (index === 0) {
      return chalk.dim(cell);
    }

    if (index === statusIndex) {
      return isErrorEntry(entry) ? chalk.red(cell) : chalk.green(cell);
    }

    if (entry.type === 'webhook-executions' && index === 6 && cell) {
      return chalk.red(cell);
    }

    return cell;
  });
}

function readOptions(ctx: SubcommandContext, type: LogType): { options: LogsQueryOptions; following: boolean } {
  const { flags } = ctx;
  const now = Date.now();
  const following = Boolean(flags['--follow']);
  const until = flags['--until'] as string | undefined;
  const before = flags['--before'] as string | undefined;

  if (following && (until || before)) {
    throw new Error('--follow cannot be combined with --until or --before.');
  }

  const utc = Boolean(flags['--utc']);
  const untilDate = until ? parseTimeArg(until, '--until', now, utc) : undefined;
  const beforeDate = before ? parseTimeArg(before, '--before', now, utc) : undefined;
  const sinceFlag = flags['--since'] as string | undefined;
  // Without --since, look back DEFAULT_SINCE from the end of the window, not from now.
  const windowEnd = Math.min(untilDate?.getTime() ?? now, beforeDate?.getTime() ?? now);
  const since = sinceFlag
    ? parseTimeArg(sinceFlag, '--since', now, utc)
    : parseTimeArg(DEFAULT_SINCE, '--since', windowEnd);

  const options: LogsQueryOptions = {
    type,
    since,
    until: untilDate,
    before: beforeDate,
    limit: (flags['--limit'] as number | undefined) ?? DEFAULT_LIMIT,
    operation: flags['--operation'] as string | undefined,
    status: flags['--status'] as string | undefined,
    event: flags['--event'] as string | undefined,
  };

  // Validates the type-specific flags before any request.
  buildLogsQuery(options);

  return { options, following };
}

async function fetchLogs(
  ctx: SubcommandContext,
  options: LogsQueryOptions,
  signal?: AbortSignal
): Promise<LogsResponse> {
  return ctx.client.fetch<LogsResponse>(`/logs?${buildLogsQuery(options)}`, { projectId: ctx.projectId, signal });
}

/** Resolves after `ms`, or right away when `signal` aborts (Ctrl+C). */
function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);

    signal.addEventListener('abort', done);
  });
}

function printEntries(ctx: SubcommandContext, entries: LogEntry[], utc: boolean): void {
  if (ctx.json) {
    for (const entry of entries) {
      ctx.client.stdout.write(`${JSON.stringify(entry)}\n`);
    }

    return;
  }

  for (const entry of entries) {
    ctx.client.output.print(`${colorRow(entry, logEntryRow(entry, utc)).join('  ')}\n`);
  }
}

async function follow(
  ctx: SubcommandContext,
  options: LogsQueryOptions,
  seen: Map<string, number>,
  utc: boolean,
  firstUntil: string
): Promise<number> {
  const { client } = ctx;
  const intervalFlag = (ctx.flags['--interval'] as number | undefined) ?? 5;

  if (!Number.isFinite(intervalFlag)) {
    client.output.error('--interval must be a number of seconds.');

    return 1;
  }

  const intervalSeconds = Math.max(2, intervalFlag);
  // The server's clock: each poll asks from the end of the previous answer, so a
  // skewed local clock can't make it skip entries.
  let windowEnd = Date.parse(firstUntil);
  const controller = new AbortController();
  const onSigint = (): void => {
    controller.abort();
  };

  process.on('SIGINT', onSigint);

  if (!ctx.json) {
    client.output.print(`${chalk.dim(`Watching for new entries every ${intervalSeconds}s. Press Ctrl+C to stop.`)}\n`);
  }

  try {
    while (!controller.signal.aborted) {
      await abortableSleep(intervalSeconds * 1000, controller.signal);

      if (controller.signal.aborted) {
        break;
      }

      let page: LogsResponse;

      try {
        page = await fetchLogs(
          ctx,
          {
            ...options,
            since: new Date(windowEnd - FOLLOW_OVERLAP_MS),
            until: undefined,
            before: undefined,
            limit: 500,
          },
          controller.signal
        );
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          break;
        }

        // Expired token, removed access, bad filter: retrying won't help.
        if (isAPIError(err) && err.status >= 400 && err.status < 500) {
          throw err;
        }

        client.output.debug(err);
        continue;
      }

      windowEnd = Math.max(windowEnd, Date.parse(page.until));
      printEntries(ctx, takeNewEntries(page.data, seen), utc);
      pruneSeen(seen, windowEnd - FOLLOW_OVERLAP_MS - 1000);
    }
  } finally {
    process.off('SIGINT', onSigint);
  }

  return 0;
}

const EMPTY_MESSAGES: { [type in LogType]: string } = {
  api: 'No API requests in this time range.',
  webhooks: 'No webhook deliveries in this time range.',
  llm: 'No AI model calls in this time range.',
};

function logsSubcommand(type: LogType, command: Subcommand['command'], aliases: string[], extraFlags = {}): Subcommand {
  return {
    command,
    aliases,
    needsProject: true,
    flags: { ...LOG_FLAGS, ...extraFlags },
    run: async (ctx) => {
      const { client } = ctx;
      let parsed;

      try {
        parsed = readOptions(ctx, type);
      } catch (err: unknown) {
        client.output.error(err instanceof Error ? err.message : String(err));

        return 1;
      }

      const { options, following } = parsed;
      const utc = Boolean(ctx.flags['--utc']);

      client.output.spinner('Loading logs…');
      const page = await fetchLogs(ctx, options);
      client.output.stopSpinner();

      // The API answers newest first; people read logs oldest first.
      const oldestFirst = [...page.data].reverse();

      if (ctx.json && !following) {
        printJson(client, page.data);
      } else if (ctx.json) {
        printEntries(ctx, oldestFirst, utc);
      } else {
        printTable(
          client,
          HEADERS[type],
          oldestFirst.map((entry) => colorRow(entry, logEntryRow(entry, utc))),
          EMPTY_MESSAGES[type]
        );

        if (page.nextBefore && !following) {
          client.output.log(
            `Showing the newest ${page.data.length} entries. For older ones run ${getCommandName(
              `logs ${type} --before ${page.nextBefore}`
            )} (with the same --since and filters).`
          );
        }
      }

      if (following) {
        const seen = new Map<string, number>();
        takeNewEntries(page.data, seen);

        return follow(ctx, options, seen, utc, page.until);
      }

      return 0;
    },
  };
}

const api = logsSubcommand('api', logsApiCommand, ['requests'], { '--operation': String, '--status': String });
const webhooks = logsSubcommand('webhooks', logsWebhooksCommand, ['webhook'], {
  '--event': String,
  '--status': String,
});
const llm = logsSubcommand('llm', logsLlmCommand, []);

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: logsCommand,
    subcommands: [api, webhooks, llm],
    defaultSubcommand: 'api',
  });
}
