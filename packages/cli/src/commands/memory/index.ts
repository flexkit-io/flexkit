import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import chalk from 'chalk';
import type Client from '../../util/client';
import { confirmAction, runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import { formatRelativeTime, printDetails, printJson } from '../../util/output/format';
import { readStdin } from '../../util/read-input';
import { memoryClearCommand, memoryCommand, memoryEditCommand, memorySetCommand, memoryShowCommand } from './command';
import {
  DEFAULT_MAX_MEMORY_LENGTH,
  buildMemoryUpdate,
  formatMemorySize,
  isMemoryChanged,
  resolveEditor,
  shellQuote,
  type MemoryResponse,
} from './memory';

const MEMORY_PATH = '/agent/memory';

function getMemory(ctx: SubcommandContext): Promise<MemoryResponse> {
  return ctx.client.fetch<MemoryResponse>(MEMORY_PATH, { projectId: ctx.projectId });
}

/** Saves the document; returns 1 after printing the problem when the input is refused locally. */
async function saveMemory(
  ctx: SubcommandContext,
  content: string,
  maxLength = DEFAULT_MAX_MEMORY_LENGTH
): Promise<number> {
  const update = buildMemoryUpdate(content, ctx.flags['--name'] as string | undefined, maxLength);

  if ('error' in update) {
    ctx.client.output.error(update.error);

    return 1;
  }

  ctx.client.output.spinner('Saving the memory');
  const saved = await ctx.client.fetch<MemoryResponse>(MEMORY_PATH, {
    projectId: ctx.projectId,
    method: 'PUT',
    body: update.body,
  });
  ctx.client.output.stopSpinner();

  if (ctx.json) {
    printJson(ctx.client, saved);

    return 0;
  }

  ctx.client.output.success(
    `Saved your memory (${formatMemorySize(saved.memory.content, saved.maxLength ?? maxLength)}).`
  );

  return 0;
}

/** `-` reads stdin; anything else is a file path (a leading @ is accepted). */
async function readMemoryFile(client: Client, value: string): Promise<string> {
  if (value === '-') {
    return readStdin(client);
  }

  const file = path.resolve(client.cwd, value.startsWith('@') ? value.slice(1) : value);

  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`File not found: ${value}. Pass a Markdown file, or - to read stdin.`);
  }

  return fs.readFileSync(file, 'utf8');
}

const show: Subcommand = {
  command: memoryShowCommand,
  flags: { '--content': Boolean },
  needsProject: true,
  async run(ctx) {
    const result = await getMemory(ctx);

    if (ctx.json) {
      printJson(ctx.client, result);

      return 0;
    }

    if (ctx.flags['--content']) {
      ctx.client.stdout.write(
        result.memory.content.endsWith('\n') ? result.memory.content : `${result.memory.content}\n`
      );

      return 0;
    }

    const { memory } = result;

    printDetails(ctx.client, [
      ['Preferred name', memory.preferredName ?? chalk.dim('not set')],
      ['Updated', memory.updatedAt ? formatRelativeTime(memory.updatedAt) : chalk.dim('never')],
      ['Size', formatMemorySize(memory.content, result.maxLength)],
    ]);

    if (memory.content.trim()) {
      ctx.client.output.print(`\n${memory.content.trimEnd()}\n`);
    } else {
      ctx.client.output.log('\nThe agent has not saved anything about you yet.');
    }

    if (result.companyMemories.length > 0) {
      ctx.client.output.print(
        `\n${chalk.bold('Company memories')} ${chalk.dim('(read-only, shared by every member)')}\n`
      );

      for (const entry of result.companyMemories) {
        ctx.client.output.print(`  - ${entry}\n`);
      }
    }

    return 0;
  },
};

const set: Subcommand = {
  command: memorySetCommand,
  flags: { '--name': String },
  needsProject: true,
  async run(ctx) {
    const [source] = ctx.args;

    return saveMemory(ctx, await readMemoryFile(ctx.client, source));
  },
};

const edit: Subcommand = {
  command: memoryEditCommand,
  flags: { '--name': String },
  needsProject: true,
  async run(ctx) {
    if (!ctx.client.stdin.isTTY || !ctx.client.stderr.isTTY) {
      ctx.client.output.error('flexkit memory edit needs a terminal. Use flexkit memory set <file|-> in scripts.');

      return 1;
    }

    const current = await getMemory(ctx);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flexkit-memory-'));
    const file = path.join(dir, 'memory.md');

    try {
      fs.writeFileSync(file, current.memory.content, { mode: 0o600 });

      const editor = resolveEditor(process.env);
      const result = spawnSync(`${editor} ${shellQuote(file)}`, { shell: true, stdio: 'inherit' });

      if (result.error || result.status !== 0) {
        ctx.client.output.error(
          `The editor (${editor}) did not exit cleanly; nothing was saved. Set $EDITOR to change it.`
        );

        return 1;
      }

      const edited = fs.readFileSync(file, 'utf8');

      if (!isMemoryChanged(current.memory.content, edited) && ctx.flags['--name'] === undefined) {
        ctx.client.output.log('No changes.');

        return 0;
      }

      return await saveMemory(ctx, edited, current.maxLength);
    } finally {
      fs.rmSync(dir, { force: true, recursive: true });
    }
  },
};

const clear: Subcommand = {
  command: memoryClearCommand,
  needsProject: true,
  async run(ctx) {
    if (!(await confirmAction(ctx, 'Clear what the agent remembers about you in this project?'))) {
      return 1;
    }

    await ctx.client.fetch(MEMORY_PATH, { projectId: ctx.projectId, method: 'DELETE' });

    if (ctx.json) {
      printJson(ctx.client, { success: true });

      return 0;
    }

    ctx.client.output.success('Cleared your memory.');

    return 0;
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: memoryCommand,
    subcommands: [show, set, edit, clear],
    defaultSubcommand: 'show',
  });
}
