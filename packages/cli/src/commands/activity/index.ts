import chalk from 'chalk';
import type Client from '../../util/client';
import { runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import {
  formatRelativeTime,
  formatStatus,
  printDetails,
  printJson,
  printTable,
  truncate,
} from '../../util/output/format';
import { getCommandName } from '../../util/pkg';
import sleep from '../../util/sleep';
import { reportSessionError } from '../chat/session';
import {
  activityCommand,
  activityDismissCommand,
  activityInspectCommand,
  activityListCommand,
  activityReadCommand,
  activitySummaryCommand,
} from './command';
import {
  chunk,
  describeState,
  formatKind,
  nextStepCommand,
  partitionIds,
  takeNewItems,
  type ActivityItem,
} from './format';

const MAX_LIMIT = 100;
const MAX_READ_IDS = 100;

interface ActivityPage {
  hasMore: boolean;
  items: ActivityItem[];
}

interface ActivitySummary {
  needsActionCount: number;
  newItems: ActivityItem[];
  unreadCount: number;
}

function withSessionHint(run: Subcommand['run']): Subcommand['run'] {
  return async (ctx) => {
    try {
      return await run(ctx);
    } catch (err: unknown) {
      ctx.client.output.stopSpinner();

      return reportSessionError(ctx.client, err);
    }
  };
}

function colorState(item: ActivityItem): string {
  const label = describeState(item);

  if (label === 'needs action') {
    return chalk.yellow(label);
  }

  if (label === 'unread') {
    return chalk.cyan(label);
  }

  return formatStatus(label);
}

function itemRow(item: ActivityItem): string[] {
  const title = truncate(item.title, 60);

  return [
    item.id,
    formatKind(item.kind),
    item.state === 'unread' ? chalk.bold(title) : title,
    colorState(item),
    formatRelativeTime(item.createdAt),
  ];
}

const HEADER = ['ID', 'KIND', 'TITLE', 'STATE', 'CREATED'];

async function fetchPage(ctx: SubcommandContext, limit: number, offset: number): Promise<ActivityPage> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });

  if (ctx.flags['--needs-action']) {
    params.set('filter', 'needs_action');
  }

  return ctx.client.fetch<ActivityPage>(`/activity?${params.toString()}`, { projectId: ctx.projectId });
}

async function follow(ctx: SubcommandContext, limit: number, seen: Set<string>): Promise<number> {
  const { client } = ctx;
  const intervalSeconds = Math.max(2, (ctx.flags['--interval'] as number | undefined) ?? 5);
  const unreadOnly = Boolean(ctx.flags['--unread']);
  let stopped = false;
  const onSigint = (): void => {
    stopped = true;
  };

  process.on('SIGINT', onSigint);

  if (!ctx.json) {
    client.output.print(`${chalk.dim(`Watching for new items every ${intervalSeconds}s. Press Ctrl+C to stop.`)}\n`);
  }

  try {
    while (!stopped) {
      await sleep(intervalSeconds * 1000);

      if (stopped) {
        break;
      }

      let page: ActivityPage;

      try {
        page = await fetchPage(ctx, limit, 0);
      } catch (err: unknown) {
        client.output.debug(err);
        continue;
      }

      const fresh = takeNewItems(page.items, seen).filter((item) => !unreadOnly || item.state === 'unread');

      for (const item of fresh) {
        if (ctx.json) {
          client.stdout.write(`${JSON.stringify(item)}\n`);
        } else {
          client.output.print(`${itemRow(item).join('  ')}\n`);
        }
      }
    }
  } finally {
    process.off('SIGINT', onSigint);
  }

  return 0;
}

const ls: Subcommand = {
  command: activityListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: {
    '--unread': Boolean,
    '--needs-action': Boolean,
    '--limit': Number,
    '--offset': Number,
    '--follow': Boolean,
    '-f': '--follow',
    '--interval': Number,
  },
  run: withSessionHint(async (ctx) => {
    const { client } = ctx;
    const limit = Math.min(Math.max(Math.floor((ctx.flags['--limit'] as number | undefined) ?? 25), 1), MAX_LIMIT);
    const offset = Math.max(0, Math.floor((ctx.flags['--offset'] as number | undefined) ?? 0));
    const following = Boolean(ctx.flags['--follow']);

    if (following && offset > 0) {
      client.output.error('--follow cannot be combined with --offset.');

      return 1;
    }

    client.output.spinner('Loading activity…');
    const page = await fetchPage(ctx, limit, offset);
    client.output.stopSpinner();

    const items = ctx.flags['--unread'] ? page.items.filter((item) => item.state === 'unread') : page.items;

    if (ctx.json) {
      if (following) {
        for (const item of [...items].reverse()) {
          client.stdout.write(`${JSON.stringify(item)}\n`);
        }
      } else {
        printJson(client, items);
      }
    } else {
      printTable(
        client,
        HEADER,
        items.map(itemRow),
        ctx.flags['--needs-action']
          ? 'Nothing waits on you.'
          : ctx.flags['--unread']
            ? 'No unread items.'
            : 'Your inbox is empty.'
      );

      if (page.hasMore && !following) {
        client.output.log(`More items exist. Use --offset ${offset + limit} to see the next ones.`);
      }
    }

    if (following) {
      return follow(ctx, limit, new Set(page.items.map((item) => item.id)));
    }

    return 0;
  }),
};

const inspect: Subcommand = {
  command: activityInspectCommand,
  aliases: ['get', 'show'],
  needsProject: true,
  flags: { '--read': Boolean },
  run: withSessionHint(async (ctx) => {
    const { client, projectId } = ctx;
    const id = ctx.args[0] as string;

    if (partitionIds([id]).invalid.length > 0) {
      client.output.error(`"${id}" is not an Activity item id.`);

      return 1;
    }

    const { item } = await client.fetch<{ item: ActivityItem }>(`/activity/${encodeURIComponent(id)}`, { projectId });

    if (ctx.flags['--read'] && item.state === 'unread') {
      await client.fetch(`/activity/read`, { projectId, method: 'POST', body: { ids: [id] } });
      item.state = 'read';
    }

    if (ctx.json) {
      printJson(client, item);

      return 0;
    }

    printDetails(client, [
      ['Title', chalk.bold(item.title)],
      ['ID', item.id],
      ['Kind', formatKind(item.kind)],
      ['State', colorState(item)],
      ['Created', `${item.createdAt} (${formatRelativeTime(item.createdAt)})`],
      ['Read', item.readAt ? formatRelativeTime(item.readAt) : null],
      ['Resolved', item.resolvedAt ? `${item.resolution ?? ''} ${formatRelativeTime(item.resolvedAt)}`.trim() : null],
      ['Chat', item.chatId],
      ['Approval', item.approvalId],
      ['Automation', item.automationId],
      ['Run', item.automationRunId],
    ]);

    if (item.body) {
      client.output.print(`\n${item.body}\n`);
    }

    const next = nextStepCommand(item);

    if (next) {
      client.output.print(`\n${chalk.dim('Next:')} ${getCommandName(next)}\n`);
    }

    return 0;
  }),
};

const read: Subcommand = {
  command: activityReadCommand,
  needsProject: true,
  flags: { '--all': Boolean },
  run: withSessionHint(async (ctx) => {
    const { client, projectId } = ctx;
    const all = Boolean(ctx.flags['--all']);

    if (all === ctx.args.length > 0) {
      client.output.error(
        all ? 'Pass item ids or --all, not both.' : 'Pass the ids of the items to mark read, or --all.'
      );

      return 1;
    }

    if (all) {
      const result = await client.fetch<{ success: boolean }>('/activity/read', {
        projectId,
        method: 'POST',
        body: { all: true },
      });

      if (ctx.json) {
        printJson(client, result);
      } else {
        client.output.success('Marked every unread item read.');
      }

      return 0;
    }

    const { valid, invalid } = partitionIds(ctx.args);

    if (invalid.length > 0) {
      client.output.error(`Not Activity item ids: ${invalid.join(', ')}`);

      return 1;
    }

    for (const batch of chunk(valid, MAX_READ_IDS)) {
      await client.fetch('/activity/read', { projectId, method: 'POST', body: { ids: batch } });
    }

    if (ctx.json) {
      printJson(client, { success: true, ids: valid });
    } else {
      client.output.success(valid.length === 1 ? `Marked ${valid[0]} read.` : `Marked ${valid.length} items read.`);
    }

    return 0;
  }),
};

const dismiss: Subcommand = {
  command: activityDismissCommand,
  needsProject: true,
  run: withSessionHint(async (ctx) => {
    const { client, projectId } = ctx;
    const { valid, invalid } = partitionIds(ctx.args);

    if (invalid.length > 0) {
      client.output.error(`Not Activity item ids: ${invalid.join(', ')}`);

      return 1;
    }

    const dismissed: ActivityItem[] = [];

    for (const id of valid) {
      const { item } = await client.fetch<{ item: ActivityItem }>(`/activity/${encodeURIComponent(id)}`, {
        projectId,
        method: 'PATCH',
        body: { state: 'dismissed' },
      });

      dismissed.push(item);
    }

    if (ctx.json) {
      printJson(client, dismissed);
    } else {
      client.output.success(valid.length === 1 ? `Dismissed ${valid[0]}.` : `Dismissed ${valid.length} items.`);
    }

    return 0;
  }),
};

const summary: Subcommand = {
  command: activitySummaryCommand,
  needsProject: true,
  run: withSessionHint(async (ctx) => {
    const result = await ctx.client.fetch<ActivitySummary>('/activity/summary', { projectId: ctx.projectId });

    if (ctx.json) {
      printJson(ctx.client, { needsActionCount: result.needsActionCount, unreadCount: result.unreadCount });

      return 0;
    }

    printDetails(ctx.client, [
      ['Unread', result.unreadCount > 0 ? chalk.cyan(String(result.unreadCount)) : '0'],
      ['Needs action', result.needsActionCount > 0 ? chalk.yellow(String(result.needsActionCount)) : '0'],
    ]);

    return 0;
  }),
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: activityCommand,
    subcommands: [ls, inspect, read, dismiss, summary],
    defaultSubcommand: 'ls',
  });
}
