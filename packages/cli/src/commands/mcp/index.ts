import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import chalk from 'chalk';
import type Client from '../../util/client';
import { confirmAction, runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import { printJson } from '../../util/output/format';
import { resolveProjectId } from '../../util/project-context';
import { findTeamId } from './team';
import humanizePath from '../../util/humanize-path';
import { mcpCommand, mcpInstallCommand, mcpUrlCommand } from './command';
import {
  buildMcpUrl,
  CLIENT_SCOPES,
  claudeCodeArgs,
  clientTarget,
  isMcpClient,
  MCP_CLIENTS,
  mcpOrigin,
  mergeMcpConfig,
  shellQuote,
  type ConfigScope,
  type McpClient,
  type McpReach,
} from './config';

const REACH_FLAGS = { '--team': Boolean, '--account': Boolean, '--read-only': Boolean };

interface ResolvedUrl {
  url: string;
  reach: McpReach;
  readOnly: boolean;
  teamId?: string;
  projectId?: string;
}

async function resolveUrl(ctx: SubcommandContext): Promise<ResolvedUrl | null> {
  const { client, flags } = ctx;
  const readOnly = Boolean(flags['--read-only']);
  const origin = mcpOrigin(client.apiUrl);

  if (flags['--team'] && flags['--account']) {
    client.output.error('Pass either --team or --account, not both.');

    return null;
  }

  if (flags['--account']) {
    return { url: buildMcpUrl({ origin, readOnly }), reach: 'account', readOnly };
  }

  const resolved = resolveProjectId(client, flags['--project'] as string | undefined);

  if (!resolved) {
    return null;
  }

  const { projectId } = resolved;
  const teamId = await findTeamId(client, projectId);

  if (!teamId) {
    client.output.error(`Project ${projectId} is not one of your projects. Check the id with \`flexkit project ls\`.`);

    return null;
  }

  if (flags['--team']) {
    return { url: buildMcpUrl({ origin, teamId, readOnly }), reach: 'team', readOnly, teamId };
  }

  return { url: buildMcpUrl({ origin, teamId, projectId, readOnly }), reach: 'project', readOnly, teamId, projectId };
}

const url: Subcommand = {
  command: mcpUrlCommand,
  flags: REACH_FLAGS,
  async run(ctx) {
    const resolved = await resolveUrl(ctx);

    if (!resolved) {
      return 1;
    }

    if (ctx.json) {
      printJson(ctx.client, resolved);

      return 0;
    }

    // The URL is the result: stdout, so it can be piped or captured.
    ctx.client.stdout.write(`${resolved.url}\n`);

    return 0;
  },
};

async function chooseClient(ctx: SubcommandContext): Promise<McpClient | null> {
  const { client } = ctx;
  const requested = ctx.flags['--client'] as string | undefined;

  if (requested) {
    if (isMcpClient(requested)) {
      return requested;
    }

    client.output.error(`Unknown client "${requested}". Choose one of: ${MCP_CLIENTS.join(', ')}.`);

    return null;
  }

  if (!client.stdin.isTTY) {
    client.output.error(`Pass --client: ${MCP_CLIENTS.join(', ')}.`);

    return null;
  }

  return client.input.select<McpClient>({
    message: 'Which client should connect to Flexkit?',
    choices: [
      { name: 'Claude Code', value: 'claude-code' },
      { name: 'Claude Desktop', value: 'claude-desktop' },
      { name: 'Cursor', value: 'cursor' },
      { name: 'VS Code', value: 'vscode' },
      { name: 'Windsurf', value: 'windsurf' },
    ],
  });
}

function installClaudeCode(ctx: SubcommandContext, name: string, serverUrl: string, scope: ConfigScope): number {
  const { client } = ctx;
  const args = claudeCodeArgs(name, serverUrl, scope);
  const display = ['claude', ...args].map(shellQuote).join(' ');

  if (ctx.flags['--dry-run']) {
    client.stdout.write(`${display}\n`);

    return 0;
  }

  const result = spawnSync('claude', args, { cwd: client.cwd, stdio: 'inherit' });

  if (result.error) {
    client.output.error(
      `Could not run the claude command (${(result.error as NodeJS.ErrnoException).code ?? result.error.message}). Install Claude Code, or run this yourself:\n  ${display}`
    );

    return 1;
  }

  if (result.status !== 0) {
    client.output.error(
      `claude mcp add failed. To replace an existing "${name}" server, run claude mcp remove ${shellQuote(name)} first.`
    );

    return result.status ?? 1;
  }

  client.output.success(`Added ${name} to Claude Code. Start Claude Code and run /mcp to sign in to Flexkit.`);

  return 0;
}

function printClaudeDesktopSteps(client: Client, name: string, serverUrl: string): number {
  client.output.print(
    [
      'Claude Desktop adds remote MCP servers as custom connectors, not through its config file:',
      '',
      '  1. In Claude (desktop or web), open Settings → Customize → Connectors.',
      '  2. Choose Add → Add custom connector.',
      `  3. Enter ${chalk.bold(name === 'flexkit' ? 'Flexkit' : name)} as the name and paste this URL:`,
      `     ${chalk.cyan(serverUrl)}`,
      '  4. Sign in to Flexkit when Claude asks.',
      '',
    ].join('\n')
  );

  return 0;
}

async function installFile(
  ctx: SubcommandContext,
  mcpClient: Exclude<McpClient, 'claude-code' | 'claude-desktop'>,
  name: string,
  serverUrl: string,
  scope: ConfigScope
): Promise<number> {
  const { client } = ctx;
  const target = clientTarget(mcpClient, scope, serverUrl, { cwd: client.cwd });
  const file = target.file as string;
  const shown = humanizePath(file);
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  let merged = mergeMcpConfig(existing, target.key, name, target.entry);

  if (merged.status === 'unchanged') {
    client.output.log(`${shown} already has the ${name} server with this URL.`);

    return 0;
  }

  if (merged.status === 'conflict') {
    client.output.log(`${shown} already has a "${name}" server: ${JSON.stringify(merged.previous)}`);

    if (ctx.flags['--dry-run'] && !ctx.yes) {
      client.output.log(
        'Installing will ask before replacing it (or pass --yes); --name adds the server under another name.'
      );
    }

    if (!ctx.flags['--dry-run'] && !(await confirmAction(ctx, `Replace the "${name}" server in ${shown}?`))) {
      return 1;
    }

    merged = mergeMcpConfig(existing, target.key, name, target.entry, { replace: true });
  }

  if (merged.status === 'conflict' || merged.status === 'unchanged') {
    return 1;
  }

  if (ctx.flags['--dry-run']) {
    client.output.log(`Would ${existing === null ? 'create' : 'update'} ${shown}:`);
    client.stdout.write(merged.text);

    return 0;
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, merged.text);

  const verb = merged.status === 'replaced' ? 'Replaced' : 'Added';
  const labels: Record<typeof mcpClient, string> = { cursor: 'Cursor', vscode: 'VS Code', windsurf: 'Windsurf' };

  client.output.success(
    `${verb} the ${name} server in ${shown}. Reload ${labels[mcpClient]} and sign in to Flexkit when it asks.`
  );

  return 0;
}

const install: Subcommand = {
  command: mcpInstallCommand,
  aliases: ['add'],
  flags: { ...REACH_FLAGS, '--client': String, '--scope': String, '--name': String, '--dry-run': Boolean },
  async run(ctx) {
    const { client } = ctx;
    const mcpClient = await chooseClient(ctx);

    if (!mcpClient) {
      return 1;
    }

    const scopes = CLIENT_SCOPES[mcpClient];
    const scope = (ctx.flags['--scope'] as ConfigScope | undefined) ?? (scopes[0] as ConfigScope);

    if (!scopes.includes(scope)) {
      client.output.error(`--scope for ${mcpClient} must be one of: ${scopes.join(', ')}.`);

      return 1;
    }

    const name = (ctx.flags['--name'] as string | undefined)?.trim() || 'flexkit';

    if (!/^[A-Za-z0-9_-]{1,64}$/.test(name)) {
      client.output.error('--name may only use letters, digits, - and _.');

      return 1;
    }

    const resolved = await resolveUrl(ctx);

    if (!resolved) {
      return 1;
    }

    switch (mcpClient) {
      case 'claude-code':
        return installClaudeCode(ctx, name, resolved.url, scope);
      case 'claude-desktop':
        return printClaudeDesktopSteps(client, name, resolved.url);
      default:
        return installFile(ctx, mcpClient, name, resolved.url, scope);
    }
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: mcpCommand,
    subcommands: [url, install],
    defaultSubcommand: 'url',
  });
}
