import chalk from 'chalk';
import type Client from '../../util/client';
import { help as printHelp } from '../help';
import parseArguments from '../../util/parse-args';
import { confirmAction, runCommandGroup, SHARED_FLAGS, type Subcommand } from '../../util/command-group';
import { formatRelativeTime, printDetails, printJson, printTable, truncate } from '../../util/output/format';
import { getCommandName } from '../../util/pkg';
import { resolveProjectId } from '../../util/project-context';
import { readStdin } from '../../util/read-input';
import {
  chatCommand,
  chatListCommand,
  chatRemoveCommand,
  chatRenameCommand,
  chatShowCommand,
  chatStopCommand,
} from './command';
import { buildPrompt, formatTranscript, resolveChatMode, type ChatMessage, type ChatSubcommandShape } from './render';
import { reportSessionError } from './session';
import { outcomeExitCode, runPromptTurn, type ChatSummary, type TurnOptions } from './turn';

const PROMPT_FLAGS = {
  '--chat': String,
  '-c': '--chat',
  '--message': String,
  '-m': '--message',
  '--model': String,
};

const CHATS_PAGE_SIZE = 30;

const chatPath = (chatId: string): string => `/agent/chats/${encodeURIComponent(chatId)}`;

interface ChatSearchResult {
  chatId: string;
  chatTitle: string | null;
  createdAt: string;
  messageId: string;
  score: number;
  snippet: string;
}

interface ChatDetail {
  chat: ChatSummary;
  hasMore: boolean;
  nextCursor: string | null;
  messages: ChatMessage[];
  monitors: { id: string; description: string; status: string; eventCount: number; expiresAt: string }[];
  pendingApproval: { id: string; operationsSummary: string; affectedCount: number | null } | null;
}

/** Wraps a subcommand so a refused API token gets a login hint instead of a bare 403. */
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

const ls: Subcommand = {
  command: chatListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: { '--search': String, '--limit': Number, '--offset': Number },
  run: withSessionHint(async (ctx) => {
    const { client, projectId } = ctx;
    const search = ctx.flags['--search'] as string | undefined;

    if (search !== undefined) {
      client.output.spinner('Searching chats…');
      const { results } = await client.fetch<{ results: ChatSearchResult[] }>(
        `/agent/chats/search?q=${encodeURIComponent(search)}`,
        { projectId }
      );
      client.output.stopSpinner();

      if (ctx.json) {
        printJson(client, results);

        return 0;
      }

      printTable(
        client,
        ['CHAT', 'TITLE', 'MATCH', 'WHEN'],
        results.map((result) => [
          result.chatId,
          truncate(result.chatTitle ?? 'Untitled', 30),
          truncate(result.snippet, 60),
          formatRelativeTime(result.createdAt),
        ]),
        `No chat matches "${search}".`
      );

      return 0;
    }

    const limit = Math.max(1, Math.floor((ctx.flags['--limit'] as number | undefined) ?? CHATS_PAGE_SIZE));
    let offset = Math.max(0, Math.floor((ctx.flags['--offset'] as number | undefined) ?? 0));
    const chats: ChatSummary[] = [];
    let hasMore = true;

    client.output.spinner('Loading chats…');

    // The API pages by 30; fetch pages until --limit is reached.
    while (chats.length < limit && hasMore) {
      const page = await client.fetch<{ chats: ChatSummary[]; hasMore: boolean }>(`/agent/chats?offset=${offset}`, {
        projectId,
      });

      chats.push(...page.chats);
      ({ hasMore } = page);
      offset += page.chats.length;

      if (page.chats.length === 0) {
        break;
      }
    }

    client.output.stopSpinner();
    const shown = chats.slice(0, limit);

    if (ctx.json) {
      printJson(client, shown);

      return 0;
    }

    printTable(
      client,
      ['ID', 'TITLE', 'LAST MESSAGE'],
      shown.map((chat) => [
        chat.id,
        truncate(chat.title ?? 'Untitled', 50),
        formatRelativeTime(chat.lastMessageAt ?? chat.createdAt),
      ]),
      `No chats yet. Start one with ${getCommandName('chat "<prompt>"')}.`
    );

    if (hasMore || chats.length > limit) {
      client.output.log(
        `More chats exist. Use --offset ${offset - (chats.length - shown.length)} to see the next ones.`
      );
    }

    return 0;
  }),
};

const show: Subcommand = {
  command: chatShowCommand,
  needsProject: true,
  flags: { '--all': Boolean },
  run: withSessionHint(async (ctx) => {
    const { client, projectId } = ctx;
    const chatId = ctx.args[0] as string;

    client.output.spinner('Loading chat…');
    const detail = await client.fetch<ChatDetail>(chatPath(chatId), { projectId });

    if (ctx.flags['--all']) {
      let cursor = detail.nextCursor;

      while (detail.hasMore && cursor) {
        const older = await client.fetch<ChatDetail>(`${chatPath(chatId)}?before=${encodeURIComponent(cursor)}`, {
          projectId,
        });

        detail.messages = [...older.messages, ...detail.messages];
        detail.hasMore = older.hasMore;
        cursor = older.nextCursor;
      }

      detail.nextCursor = cursor;
    }

    client.output.stopSpinner();

    if (ctx.json) {
      printJson(client, detail);

      return 0;
    }

    client.output.print(`${chalk.bold(detail.chat.title ?? 'Untitled chat')} ${chalk.dim(detail.chat.id)}\n`);

    if (detail.hasMore) {
      client.output.print(`${chalk.dim('Older messages are hidden; pass --all to print the whole history.')}\n`);
    }

    client.output.print('\n');
    client.stdout.write(
      `${formatTranscript(detail.messages, {
        formatTime: (value) => formatRelativeTime(value),
        style: {
          heading: (value) => chalk.bold(value),
          dim: (value) => chalk.dim(value),
          error: (value) => chalk.red(value),
        },
      })}\n`
    );

    if (detail.pendingApproval) {
      client.output.print('\n');
      client.output.warn(
        `A change waits for your approval: ${detail.pendingApproval.operationsSummary}. Review it with ${getCommandName(
          `approvals inspect ${detail.pendingApproval.id}`
        )}.`
      );
    }

    if (detail.monitors.length > 0) {
      client.output.print('\n');
      printDetails(
        client,
        detail.monitors.map((monitor) => [
          'Monitor',
          `${monitor.description} ${chalk.dim(`(${monitor.eventCount} events, expires ${formatRelativeTime(monitor.expiresAt)})`)}`,
        ])
      );
    }

    return 0;
  }),
};

const stop: Subcommand = {
  command: chatStopCommand,
  needsProject: true,
  run: withSessionHint(async (ctx) => {
    const chatId = ctx.args[0] as string;
    const result = await ctx.client.fetch<{ message: ChatMessage }>(`${chatPath(chatId)}/stop`, {
      projectId: ctx.projectId,
      method: 'POST',
    });

    if (ctx.json) {
      printJson(ctx.client, result.message);

      return 0;
    }

    ctx.client.output.success(`Stopped the running turn in chat ${chatId}.`);

    return 0;
  }),
};

const rename: Subcommand = {
  command: chatRenameCommand,
  needsProject: true,
  run: withSessionHint(async (ctx) => {
    const [chatId, ...titleWords] = ctx.args as [string, ...string[]];
    const title = titleWords.join(' ').trim();

    if (!title) {
      ctx.client.output.error('The title is empty.');

      return 1;
    }

    const result = await ctx.client.fetch<{ chat: ChatSummary }>(chatPath(chatId), {
      projectId: ctx.projectId,
      method: 'PATCH',
      body: { title },
    });

    if (ctx.json) {
      printJson(ctx.client, result.chat);

      return 0;
    }

    ctx.client.output.success(`Renamed chat ${chatId} to "${result.chat.title ?? title}".`);

    return 0;
  }),
};

const rm: Subcommand = {
  command: chatRemoveCommand,
  aliases: ['remove'],
  needsProject: true,
  run: withSessionHint(async (ctx) => {
    const chatId = ctx.args[0] as string;

    if (!(await confirmAction(ctx, `Delete chat ${chatId} and all its messages?`))) {
      return 1;
    }

    const result = await ctx.client.fetch<{ success: boolean }>(chatPath(chatId), {
      projectId: ctx.projectId,
      method: 'DELETE',
    });

    if (ctx.json) {
      printJson(ctx.client, result);

      return 0;
    }

    ctx.client.output.success(`Deleted chat ${chatId}.`);

    return 0;
  }),
};

const subcommands = [ls, show, stop, rename, rm];

const SHAPES: ChatSubcommandShape[] = [
  { names: ['ls', 'list'], args: 'none' },
  { names: ['show', 'stop', 'rm', 'remove'], args: 'id' },
  { names: ['rename'], args: 'id+text' },
];

async function runRepl(opts: TurnOptions, initialChatId: string | null): Promise<number> {
  const { client } = opts;
  let chatId = initialChatId;

  client.output.print(
    `${chalk.dim(
      `Chatting with the Flexkit agent${chatId ? ` in chat ${chatId}` : ''}. /new starts a new chat, /exit leaves, Ctrl+C stops a running reply.`
    )}\n`
  );

  for (;;) {
    let line: string;

    try {
      line = await client.input.text({ message: 'You:' });
    } catch {
      // Ctrl+C or Ctrl+D at the prompt ends the session.
      return 0;
    }

    const text = line.trim();

    if (!text) {
      continue;
    }

    if (text === '/exit' || text === '/quit') {
      return 0;
    }

    if (text === '/new') {
      chatId = null;
      client.output.print(`${chalk.dim('The next message starts a new chat.')}\n`);
      continue;
    }

    try {
      const result = await runPromptTurn(opts, chatId, text);

      if (!chatId) {
        ({ chatId } = result);
        client.output.print(`${chalk.dim(`Chat ${chatId}`)}\n`);
      }

      client.output.print('\n');
    } catch (err: unknown) {
      reportSessionError(client, err);
    }
  }
}

async function runPrompt(client: Client, rawArgs: string[]): Promise<number> {
  const { output } = client;
  let parsed;

  try {
    parsed = parseArguments(rawArgs, { ...SHARED_FLAGS, ...PROMPT_FLAGS });
  } catch (err: unknown) {
    output.error(
      `${err instanceof Error ? err.message : String(err)}. Run ${getCommandName('chat --help')} for usage.`
    );

    return 1;
  }

  const { flags } = parsed;
  const built = buildPrompt(parsed.args.slice(1), flags['--message']);

  if ('error' in built) {
    output.error(built.error);

    return 1;
  }

  const resolved = resolveProjectId(client, flags['--project']);

  if (!resolved) {
    return 1;
  }

  const json = Boolean(flags['--json']);
  const chatId = flags['--chat'] ?? null;
  const opts: TurnOptions = {
    client,
    projectId: resolved.projectId,
    json,
    interactive: !json && Boolean(client.stdin.isTTY) && Boolean(client.stderr.isTTY),
    modelId: flags['--model'],
  };

  try {
    let { prompt } = built;

    if (prompt === '-') {
      prompt = (await readStdin(client)).trim();

      if (!prompt) {
        output.error('The prompt read from stdin is empty.');

        return 1;
      }
    }

    if (prompt === null) {
      if (opts.interactive) {
        return await runRepl(opts, chatId);
      }

      output.error(`Pass a prompt, or - to read it from stdin. Run ${getCommandName('chat --help')} for usage.`);

      return 1;
    }

    const result = await runPromptTurn(opts, chatId, prompt);

    if (!json && !chatId && result.outcome !== 'waiting') {
      output.print(
        `${chalk.dim(`Continue this chat: ${getCommandName(`chat --chat ${result.chatId} "<message>"`)}`)}\n`
      );
    }

    return outcomeExitCode(result.outcome);
  } catch (err: unknown) {
    output.stopSpinner();

    return reportSessionError(client, err);
  }
}

export default async function main(client: Client): Promise<number> {
  const rawArgs = client.argv.slice(2);
  const dash = rawArgs.indexOf('--');
  const beforeDash = dash === -1 ? rawArgs : rawArgs.slice(0, dash);
  const group = { command: chatCommand, subcommands };
  let firstPass;

  try {
    // Every subcommand's flags are known here, so `ls --limit 3` keeps 3 out of the positionals.
    const subcommandFlags = Object.assign({}, ...subcommands.map((sub) => sub.flags ?? {})) as typeof PROMPT_FLAGS;
    firstPass = parseArguments(
      beforeDash,
      { ...SHARED_FLAGS, ...PROMPT_FLAGS, ...subcommandFlags },
      { permissive: true }
    );
  } catch (err: unknown) {
    client.output.error(err instanceof Error ? err.message : String(err));

    return 1;
  }

  const positionals = firstPass.args.slice(1);
  const help = Boolean(firstPass.flags['--help']);
  const mode = resolveChatMode(positionals, SHAPES, { help });

  if (mode.mode === 'subcommand' || (help && positionals.length === 0)) {
    return runCommandGroup(client, group);
  }

  if (help) {
    client.output.print(printHelp(chatCommand, { columns: client.stderr.columns }));

    return 2;
  }

  return runPrompt(client, rawArgs);
}
