import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import open from 'open';
import type Client from '../../util/client';
import { confirmAction, runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import {
  formatRelativeTime,
  formatStatus,
  printDetails,
  printJson,
  printTable,
  truncate,
} from '../../util/output/format';
import { readStdin } from '../../util/read-input';
import { getCommandName } from '../../util/pkg';
import sleep from '../../util/sleep';
import {
  pluginsAddCommand,
  pluginsCommand,
  pluginsConnectCommand,
  pluginsDisconnectCommand,
  pluginsInspectCommand,
  pluginsListCommand,
  pluginsRemoveCommand,
  pluginsToolsCommand,
} from './command';
import {
  connectTypeLabel,
  credentialFieldsFor,
  defaultScope,
  filterPlugins,
  findNewConnection,
  isUuid,
  parseStringPairs,
  pickConnection,
  pluginState,
  studioOrigin,
  studioPluginUrl,
  toolAccess,
  unknownCredentialKeys,
  validateCredential,
  type CredentialField,
  type Marketplace,
  type PluginConnect,
  type PluginConnection,
  type PluginDetail,
  type PluginScope,
  type PluginToolsResponse,
} from './helpers';

const OAUTH_POLL_INTERVAL_MS = 2000;
const OAUTH_TIMEOUT_MS = 600_000;

function pluginPath(pluginId: string, operation = ''): string {
  return `/plugins/${encodeURIComponent(pluginId)}${operation ? `/${operation}` : ''}`;
}

function connectionPath(connectionId: string, operation = ''): string {
  return `/plugin-connections/${encodeURIComponent(connectionId)}${operation ? `/${operation}` : ''}`;
}

function getDetail(ctx: SubcommandContext, pluginId: string): Promise<PluginDetail> {
  return ctx.client.fetch<PluginDetail>(pluginPath(pluginId), { projectId: ctx.projectId });
}

/** Reads a secret flag value: `-` for stdin, `@file`, or the inline value. */
async function readSecretValue(client: Client, value: string): Promise<string> {
  if (value === '-') {
    return (await readStdin(client)).trim();
  }

  if (value.startsWith('@')) {
    return fs.readFileSync(path.resolve(client.cwd, value.slice(1)), 'utf8').trim();
  }

  return value;
}

function connectionRows(connections: PluginConnection[]): string[][] {
  return connections.map((connection) => [
    connection.id,
    connection.displayName,
    connection.scope,
    formatStatus(connection.status),
    connection.isPrimary ? 'yes' : '',
    formatRelativeTime(connection.createdAt),
  ]);
}

const CONNECTION_HEADER = ['ID', 'ACCOUNT', 'SCOPE', 'STATUS', 'PRIMARY', 'CONNECTED'];

const ls: Subcommand = {
  command: pluginsListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: { '--available': Boolean, '--all': Boolean },
  async run(ctx) {
    const { client } = ctx;
    const filter = ctx.flags['--all'] ? 'all' : ctx.flags['--available'] ? 'available' : 'in-use';
    const marketplace = await client.fetch<Marketplace>('/plugins', { projectId: ctx.projectId });
    const plugins = filterPlugins(marketplace.plugins, filter);

    if (ctx.json) {
      printJson(client, plugins);

      return 0;
    }

    printTable(
      client,
      ['ID', 'NAME', 'CATEGORY', 'STATUS', 'CONNECTS WITH', 'ACCOUNTS', 'VERSION'],
      plugins.map((plugin) => [
        plugin.id,
        `${plugin.name}${plugin.preview ? chalk.dim(' (preview)') : ''}`,
        plugin.category,
        formatStatus(pluginState(plugin)),
        connectTypeLabel(plugin.connect),
        plugin.connections.length > 0 ? String(plugin.connections.length) : '',
        plugin.version ?? '',
      ]),
      filter === 'in-use'
        ? `No plugins in use yet. Browse the catalog with ${getCommandName('plugins ls --available')}.`
        : 'The plugin catalog is empty.'
    );

    return 0;
  },
};

const inspect: Subcommand = {
  command: pluginsInspectCommand,
  aliases: ['get'],
  needsProject: true,
  async run(ctx) {
    const { client } = ctx;
    const detail = await getDetail(ctx, ctx.args[0] as string);

    if (ctx.json) {
      printJson(client, detail);

      return 0;
    }

    const { plugin } = detail;

    printDetails(client, [
      ['ID', plugin.id],
      ['Name', `${plugin.name}${plugin.preview ? ' (preview)' : ''}`],
      ['Description', plugin.description],
      ['Category', plugin.category],
      ['Status', formatStatus(pluginState(plugin))],
      ['Version', plugin.version],
      ['Updated', formatRelativeTime(plugin.updatedAt)],
      ['Connects with', connectTypeLabel(plugin.connect)],
      ['Scopes', plugin.scopes.join(', ')],
      ['Personal accounts', plugin.allowPersonal ? 'allowed' : 'not allowed'],
      ['Agent tools', plugin.capabilities.agentTools ? 'yes' : 'no'],
      ['Automation delivery', plugin.capabilities.automationDelivery ? 'yes' : 'no'],
      ['MCP servers', detail.servers.join(', ')],
      ['Used by', plugin.usedBy.map((entry) => entry.name).join(', ')],
      ['Source', plugin.sourceUrl],
    ]);

    if (plugin.connections.length > 0) {
      client.output.print(`\n${chalk.bold('Accounts')}\n`);
      printTable(client, CONNECTION_HEADER, connectionRows(plugin.connections));
    }

    if (detail.skills.length > 0) {
      client.output.print(`\n${chalk.bold('Skills')}\n`);
      printTable(
        client,
        ['NAME', 'DESCRIPTION'],
        detail.skills.map((skill) => [skill.name, truncate(skill.description, 80)])
      );
    }

    for (const diagnostic of detail.diagnostics) {
      client.output.warn(diagnostic);
    }

    return 0;
  },
};

const add: Subcommand = {
  command: pluginsAddCommand,
  aliases: ['install', 'enable'],
  needsProject: true,
  async run(ctx) {
    const { client, projectId } = ctx;
    const pluginId = ctx.args[0] as string;
    const { plugin } = await getDetail(ctx, pluginId);

    client.output.spinner(`Installing ${plugin.name}`);

    if (!plugin.enabled) {
      await client.fetch(pluginPath(pluginId, 'policy'), {
        method: 'PATCH',
        projectId,
        body: { enabled: true, allowPersonal: plugin.allowPersonal },
      });
    }

    const result = await client.fetch<{ installation: Record<string, unknown> }>(pluginPath(pluginId, 'installation'), {
      method: 'PUT',
      projectId,
      body: {},
    });

    client.output.stopSpinner();

    if (ctx.json) {
      printJson(client, result);

      return 0;
    }

    client.output.success(`Installed ${plugin.name} (${pluginId}).`);

    if (plugin.connections.length === 0) {
      client.output.log(`Connect an account with ${getCommandName(`plugins connect ${pluginId}`)}.`);
    }

    return 0;
  },
};

const rm: Subcommand = {
  command: pluginsRemoveCommand,
  aliases: ['remove', 'disable'],
  needsProject: true,
  async run(ctx) {
    const { client, projectId } = ctx;
    const pluginId = ctx.args[0] as string;
    const { plugin } = await getDetail(ctx, pluginId);

    if (!plugin.enabled) {
      if (ctx.json) {
        printJson(client, { success: true, pluginId, enabled: false });
      } else {
        client.output.log(`${plugin.name} is already disabled.`);
      }

      return 0;
    }

    if (!(await confirmAction(ctx, `Disable ${plugin.name} in project ${projectId}?`))) {
      return 1;
    }

    const result = await client.fetch<{ success: boolean }>(pluginPath(pluginId, 'policy'), {
      method: 'PATCH',
      projectId,
      body: { enabled: false, allowPersonal: plugin.allowPersonal },
    });

    if (ctx.json) {
      printJson(client, { ...result, pluginId, enabled: false });

      return 0;
    }

    client.output.success(`Disabled ${plugin.name} (${pluginId}). Its accounts stay connected.`);

    return 0;
  },
};

async function promptCredential(client: Client, field: CredentialField): Promise<string> {
  const help = field.help ? ` ${chalk.dim(field.help)}` : '';

  return client.input.text({
    message: `${field.label}${field.required ? '' : ' (optional)'}${help}`,
    ...(field.kind === 'secret' ? { transformer: (value: string) => '•'.repeat(value.length) } : {}),
    validate: (value: string) => validateCredential(field, value.trim()) ?? true,
  });
}

async function connectCredentials(
  ctx: SubcommandContext,
  pluginId: string,
  connect: Extract<PluginConnect, { type: 'credentials' }>,
  scope: PluginScope
): Promise<number> {
  const { client } = ctx;
  const interactive = Boolean(client.stdin.isTTY);
  let method = ctx.flags['--method'] as string | undefined;

  if (connect.methods.length > 0 && !method) {
    if (interactive && connect.methods.length > 1) {
      client.output.log(connect.description);
      method = await client.input.select<string>({
        message: 'How do you want to connect?',
        choices: connect.methods.map((item) => ({
          name: item.label,
          value: item.key,
          ...(item.description ? { description: item.description } : {}),
        })),
      });
    } else {
      method = connect.methods[0]?.key;
    }
  }

  const fields = credentialFieldsFor(connect, method);

  if (!fields) {
    client.output.error(
      `Unknown --method "${method ?? ''}". Choose one of: ${connect.methods.map((item) => item.key).join(', ')}.`
    );

    return 1;
  }

  const given = parseStringPairs(ctx.flags['--set'] as string[] | undefined);
  const unknown = unknownCredentialKeys(fields, given);

  if (unknown.length > 0) {
    client.output.error(
      `Unknown field ${unknown.join(', ')}. This form takes: ${fields.map((field) => field.key).join(', ')}.`
    );

    return 1;
  }

  const values: Record<string, string> = {};

  for (const field of fields) {
    let value = given[field.key] !== undefined ? await readSecretValue(client, given[field.key] as string) : undefined;

    if ((value === undefined || value === '') && field.required) {
      if (!interactive) {
        client.output.error(`Missing ${field.label}. Pass --set ${field.key}=VALUE when running without a terminal.`);

        return 1;
      }

      value = (await promptCredential(client, field)).trim();
    }

    const problem = validateCredential(field, value);

    if (problem) {
      client.output.error(problem);

      return 1;
    }

    if (value) {
      values[field.key] = value;
    }
  }

  const reconnect = ctx.flags['--reconnect'] as string | undefined;

  client.output.spinner('Verifying the credentials');
  const result = await client.fetch<{ connection: PluginConnection }>('/plugins/connect-credentials', {
    method: 'POST',
    projectId: ctx.projectId,
    body: {
      pluginId,
      scope,
      ...(method ? { method } : {}),
      values,
      ...(reconnect ? { connectionId: reconnect } : {}),
    },
  });

  client.output.stopSpinner();

  return reportConnected(ctx, result.connection);
}

async function connectToken(
  ctx: SubcommandContext,
  pluginId: string,
  connect: Extract<PluginConnect, { type: 'api-token' }>,
  scope: PluginScope
): Promise<number> {
  const { client } = ctx;
  const flag = ctx.flags['--api-token'] as string | undefined;
  const field: CredentialField = {
    key: 'token',
    label: connect.tokenLabel,
    kind: 'secret',
    placeholder: connect.placeholder,
    help: connect.helpUrl ? `Create one at ${connect.helpUrl}` : null,
    pattern: connect.pattern,
    required: true,
  };
  let token = flag ? await readSecretValue(client, flag) : '';

  if (!token) {
    if (!client.stdin.isTTY) {
      client.output.error(`Missing ${connect.tokenLabel}. Pass --api-token VALUE, --api-token @file or --api-token - (stdin).`);

      return 1;
    }

    token = (await promptCredential(client, field)).trim();
  }

  const problem = validateCredential(field, token);

  if (problem) {
    client.output.error(problem);

    return 1;
  }

  const reconnect = ctx.flags['--reconnect'] as string | undefined;

  client.output.spinner('Verifying the token');
  const result = await client.fetch<{ connection: PluginConnection }>('/plugins/connect-token', {
    method: 'POST',
    projectId: ctx.projectId,
    body: { pluginId, scope, token, ...(reconnect ? { connectionId: reconnect } : {}) },
  });

  client.output.stopSpinner();

  return reportConnected(ctx, result.connection);
}

/**
 * Sign-in plugins finish OAuth in a Studio popup (the start page only hands
 * off to the window that opened it), so the CLI opens the plugin's Studio page
 * and waits for the new account to show up.
 */
async function connectOAuth(ctx: SubcommandContext, pluginId: string, before: PluginConnection[]): Promise<number> {
  const { client } = ctx;
  const url = studioPluginUrl(studioOrigin(), ctx.projectId, pluginId);
  const noBrowser = Boolean(ctx.flags['--no-browser']) || !client.stdout.isTTY;

  if (noBrowser) {
    client.output.log(`Open this page, choose Connect and sign in:\n  ${url}`);
  } else {
    client.output.log(`Opening Studio. Choose Connect on the plugin page and sign in:\n  ${url}`);

    try {
      await open(url);
    } catch {
      client.output.warn('Could not open a browser. Open the link above yourself.');
    }
  }

  if (ctx.flags['--no-wait']) {
    if (ctx.json) {
      printJson(client, { url });
    }

    return 0;
  }

  const deadline = Date.now() + OAUTH_TIMEOUT_MS;

  client.output.spinner('Waiting for the account to be connected (Ctrl+C to stop)');

  while (Date.now() < deadline) {
    await sleep(OAUTH_POLL_INTERVAL_MS);

    let detail: PluginDetail;

    try {
      detail = await getDetail(ctx, pluginId);
    } catch {
      continue;
    }

    const connection = findNewConnection(before, detail.plugin.connections);

    if (connection) {
      client.output.stopSpinner();

      return reportConnected(ctx, connection);
    }
  }

  client.output.stopSpinner();
  client.output.error(
    `No new account was connected within 10 minutes. Run ${getCommandName(`plugins inspect ${pluginId}`)} to check.`
  );

  return 1;
}

function reportConnected(ctx: SubcommandContext, connection: PluginConnection): number {
  if (ctx.json) {
    printJson(ctx.client, { connection });

    return 0;
  }

  ctx.client.output.success(
    `Connected ${connection.displayName} to ${connection.pluginId} (${connection.scope}, ${connection.id}).`
  );

  return 0;
}

const connect: Subcommand = {
  command: pluginsConnectCommand,
  needsProject: true,
  flags: {
    '--scope': String,
    '--api-token': String,
    '--method': String,
    '--set': [String] as [StringConstructor],
    '--reconnect': String,
    '--no-browser': Boolean,
    '--no-wait': Boolean,
  },
  async run(ctx) {
    const { client } = ctx;
    const pluginId = ctx.args[0] as string;
    const detail = await getDetail(ctx, pluginId);
    const { plugin } = detail;
    const requested = ctx.flags['--scope'] as string | undefined;

    if (requested !== undefined && requested !== 'project' && requested !== 'personal') {
      client.output.error('--scope must be "project" or "personal".');

      return 1;
    }

    const scope = (requested as PluginScope | undefined) ?? defaultScope(plugin, detail.canManage);

    if (!scope) {
      client.output.error(
        plugin.scopes.includes('project')
          ? 'Ask a project owner or developer to connect this plugin.'
          : 'Personal accounts are not allowed for this plugin in this project.'
      );

      return 1;
    }

    if (!plugin.scopes.includes(scope)) {
      client.output.error(`${plugin.name} supports only ${plugin.scopes.join(' and ')} accounts.`);

      return 1;
    }

    if (!plugin.enabled) {
      client.output.error(
        `${plugin.name} is disabled in this project. Enable it with ${getCommandName(`plugins add ${pluginId}`)}.`
      );

      return 1;
    }

    const connectInfo = plugin.connect ?? { type: 'oauth' as const };

    if (connectInfo.type === 'credentials') {
      return connectCredentials(ctx, pluginId, connectInfo, scope);
    }

    if (connectInfo.type === 'api-token') {
      return connectToken(ctx, pluginId, connectInfo, scope);
    }

    if (ctx.flags['--api-token'] || ctx.flags['--set'] || ctx.flags['--method'] || ctx.flags['--reconnect']) {
      client.output.error(
        `${plugin.name} connects with a sign-in in Studio; --api-token, --set, --method and --reconnect do not apply.`
      );

      return 1;
    }

    return connectOAuth(ctx, pluginId, plugin.connections);
  },
};

async function chooseConnection(
  ctx: SubcommandContext,
  connections: PluginConnection[],
  explicit: string | undefined
): Promise<PluginConnection | null> {
  const { client } = ctx;

  if (explicit) {
    const match = connections.find((connection) => connection.id === explicit);

    if (!match) {
      client.output.error(`Connection ${explicit} is not an account of this plugin.`);
    }

    return match ?? null;
  }

  if (connections.length === 1) {
    return connections[0] ?? null;
  }

  if (connections.length === 0) {
    client.output.error('This plugin has no connected account.');

    return null;
  }

  if (!client.stdin.isTTY) {
    client.output.error(
      `This plugin has ${connections.length} accounts. Pass --connection <id>: ${connections.map((connection) => connection.id).join(', ')}`
    );

    return null;
  }

  const id = await client.input.select<string>({
    message: 'Which account?',
    choices: connections.map((connection) => ({
      name: `${connection.displayName} ${chalk.dim(`${connection.scope} · ${connection.id}`)}`,
      value: connection.id,
    })),
  });

  return connections.find((connection) => connection.id === id) ?? null;
}

const disconnect: Subcommand = {
  command: pluginsDisconnectCommand,
  needsProject: true,
  flags: { '--connection': String },
  async run(ctx) {
    const { client, projectId } = ctx;
    const target = ctx.args[0] as string;
    let connection: PluginConnection | null;

    if (isUuid(target)) {
      const marketplace = await client.fetch<Marketplace>('/plugins', { projectId });
      connection =
        marketplace.plugins.flatMap((plugin) => plugin.connections).find((entry) => entry.id === target) ?? null;

      if (!connection) {
        client.output.error(`Connection ${target} was not found among your accounts.`);

        return 1;
      }
    } else {
      const { plugin } = await getDetail(ctx, target);
      connection = await chooseConnection(ctx, plugin.connections, ctx.flags['--connection'] as string | undefined);
    }

    if (!connection) {
      return 1;
    }

    if (
      !(await confirmAction(
        ctx,
        `Disconnect ${connection.displayName} (${connection.scope}) from ${connection.pluginId}?`
      ))
    ) {
      return 1;
    }

    const result = await client.fetch<{ success: boolean }>(connectionPath(connection.id), {
      method: 'DELETE',
      projectId,
    });

    if (ctx.json) {
      printJson(client, { ...result, connectionId: connection.id });

      return 0;
    }

    client.output.success(`Disconnected ${connection.displayName} (${connection.id}).`);

    return 0;
  },
};

const tools: Subcommand = {
  command: pluginsToolsCommand,
  needsProject: true,
  flags: { '--connection': String, '--refresh': Boolean },
  async run(ctx) {
    const { client, projectId } = ctx;
    const pluginId = ctx.args[0] as string;
    const { plugin } = await getDetail(ctx, pluginId);
    const picked = pickConnection(plugin.connections, ctx.flags['--connection'] as string | undefined);

    if ('error' in picked) {
      client.output.error(`${picked.error} Connect one with ${getCommandName(`plugins connect ${pluginId}`)}.`);

      return 1;
    }

    const refresh = Boolean(ctx.flags['--refresh']);

    client.output.spinner(refresh ? 'Fetching tools from the provider' : 'Loading tools');
    const result = await client.fetch<PluginToolsResponse>(
      connectionPath(picked.connection.id, refresh ? 'tools/refresh' : 'tools'),
      { method: refresh ? 'POST' : 'GET', projectId }
    );

    client.output.stopSpinner();

    if (ctx.json) {
      printJson(client, { connectionId: picked.connection.id, ...result });

      return 0;
    }

    client.output.dim(`Account: ${picked.connection.displayName} (${picked.connection.scope})`);

    const rows = result.servers.flatMap((server) =>
      server.tools.map((tool) => [tool.name, toolAccess(tool), server.name, truncate(tool.description, 70)])
    );

    printTable(client, ['TOOL', 'ACCESS', 'SERVER', 'DESCRIPTION'], rows, 'This account offers no tools.');

    for (const server of result.servers) {
      if (server.error) {
        client.output.warn(`${server.name}: ${server.error}`);
      }
    }

    return 0;
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: pluginsCommand,
    subcommands: [ls, inspect, add, rm, connect, disconnect, tools],
    defaultSubcommand: 'ls',
  });
}
