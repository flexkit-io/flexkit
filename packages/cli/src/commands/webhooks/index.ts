import chalk from 'chalk';
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
import {
  webhooksCommand,
  webhooksCreateCommand,
  webhooksDisableCommand,
  webhooksEnableCommand,
  webhooksInspectCommand,
  webhooksListCommand,
  webhooksRemoveCommand,
  webhooksUpdateCommand,
} from './command';
import {
  buildCreateBody,
  buildUpdateBody,
  formatDeliveries,
  formatEntities,
  formatEvents,
  isWebhookId,
  matchWebhooks,
  redactWebhook,
  type WebhookBody,
  type WebhookDto,
  type WebhookFlags,
} from './webhooks';

interface WebhooksListResponse {
  /** The plan's webhook limit, when known. */
  limit: number | null;
  webhooks: WebhookDto[];
}

interface WebhookMutationResponse {
  success: boolean;
  webhook?: WebhookDto;
  errorCode?: string;
  errorMessage?: string | string[];
}

const EDIT_FLAGS = {
  '--show-secrets': Boolean,
  '--url': String,
  '--name': String,
  '--description': String,
  '--entity': [String] as [StringConstructor],
  '--on': [String] as [StringConstructor],
  '--header': [String] as [StringConstructor],
  '--method': String,
  '--secret': String,
};

function readEditFlags(flags: Record<string, unknown>): WebhookFlags {
  return {
    url: flags['--url'] as string | undefined,
    name: flags['--name'] as string | undefined,
    description: flags['--description'] as string | undefined,
    entities: flags['--entity'] as string[] | undefined,
    on: flags['--on'] as string[] | undefined,
    headers: flags['--header'] as string[] | undefined,
    removeHeaders: flags['--remove-header'] as string[] | undefined,
    allEntities: Boolean(flags['--all-entities']),
    method: flags['--method'] as string | undefined,
    secret: flags['--secret'] as string | undefined,
    disabled: Boolean(flags['--disabled']),
  };
}

function listWebhooks(ctx: SubcommandContext): Promise<WebhooksListResponse> {
  return ctx.client.fetch<WebhooksListResponse>('/webhooks', { projectId: ctx.projectId });
}

/**
 * Finds a webhook by id, else by exact (case-insensitive) name. Pass `list` to
 * match names against an already fetched list instead of fetching it again.
 */
async function resolveWebhook(ctx: SubcommandContext, idOrName: string, list?: WebhookDto[]): Promise<WebhookDto> {
  if (isWebhookId(idOrName)) {
    const known = list?.find((webhook) => webhook.id === idOrName);

    if (known) {
      return known;
    }

    const { webhook } = await ctx.client.fetch<{ webhook: WebhookDto }>(`/webhooks/${encodeURIComponent(idOrName)}`, {
      projectId: ctx.projectId,
    });

    return webhook;
  }

  const matches = matchWebhooks(list ?? (await listWebhooks(ctx)).webhooks, idOrName);

  if (matches.length === 0) {
    throw new Error(`No webhook named "${idOrName}". Run \`flexkit webhooks ls\` to see the webhooks.`);
  }

  if (matches.length > 1) {
    throw new Error(
      `Several webhooks are named "${idOrName}": ${matches.map((webhook) => webhook.id).join(', ')}. Pass the id instead.`
    );
  }

  return matches[0] as WebhookDto;
}

/** Resolves every argument first, so a typo changes nothing. Fetches the list once. */
async function resolveWebhooks(ctx: SubcommandContext): Promise<WebhookDto[]> {
  const list = (await listWebhooks(ctx)).webhooks;
  const webhooks: WebhookDto[] = [];

  for (const idOrName of ctx.args) {
    const webhook = await resolveWebhook(ctx, idOrName, list);

    if (!webhooks.some((entry) => entry.id === webhook.id)) {
      webhooks.push(webhook);
    }
  }

  return webhooks;
}

function requireWebhook(response: WebhookMutationResponse): WebhookDto {
  if (!response.success || !response.webhook) {
    const message = Array.isArray(response.errorMessage) ? response.errorMessage.join('\n') : response.errorMessage;

    throw new Error(message || 'The webhook could not be saved.');
  }

  return response.webhook;
}

function patchWebhook(ctx: SubcommandContext, id: string, body: WebhookBody): Promise<WebhookMutationResponse> {
  return ctx.client.fetch<WebhookMutationResponse>(`/webhooks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { ...body },
    projectId: ctx.projectId,
  });
}

function printWebhookLine(ctx: SubcommandContext, verb: string, webhook: WebhookDto): void {
  ctx.client.output.success(`${verb} webhook ${chalk.bold(webhook.name)} ${chalk.dim(`(${webhook.id})`)}`);
}

function showSecrets(ctx: SubcommandContext): boolean {
  return Boolean(ctx.flags['--show-secrets']);
}

function statusLabel(webhook: WebhookDto): string {
  return formatStatus(webhook.enabled ? 'enabled' : 'disabled');
}

const ls: Subcommand = {
  command: webhooksListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: { '--show-secrets': Boolean },
  async run(ctx) {
    const result = await listWebhooks(ctx);

    if (ctx.json) {
      printJson(ctx.client, {
        ...result,
        webhooks: result.webhooks.map((webhook) => redactWebhook(webhook, showSecrets(ctx))),
      });

      return 0;
    }

    printTable(
      ctx.client,
      ['ID', 'NAME', 'STATUS', 'REQUEST', 'EVENTS', 'ENTITIES', 'DELIVERIES', 'LAST CALL'],
      result.webhooks.map((webhook) => [
        chalk.dim(webhook.id),
        webhook.name,
        statusLabel(webhook),
        `${webhook.method} ${truncate(webhook.url, 45)}`,
        formatEvents(webhook.events),
        truncate(formatEntities(webhook.entities), 30),
        formatDeliveries(webhook.deliveries),
        formatRelativeTime(webhook.lastTriggeredAt) || chalk.dim('never'),
      ]),
      'No webhooks yet. Create one with `flexkit webhooks create --url <url>`.'
    );

    if (result.limit !== null && result.webhooks.length > 0) {
      ctx.client.output.log(
        chalk.dim(`${String(result.webhooks.length)} of ${String(result.limit)} webhooks allowed on your plan.`)
      );
    }

    return 0;
  },
};

const inspect: Subcommand = {
  command: webhooksInspectCommand,
  aliases: ['get'],
  needsProject: true,
  flags: { '--show-secrets': Boolean },
  async run(ctx) {
    const webhook = await resolveWebhook(ctx, ctx.args[0] as string);

    if (ctx.json) {
      printJson(ctx.client, { webhook: redactWebhook(webhook, showSecrets(ctx)) });

      return 0;
    }

    const show = Boolean(ctx.flags['--show-secrets']);
    const hiddenForRole =
      webhook.headers.some((header) => header.value === null) || (webhook.hasSecret && !webhook.secret);
    const mask = (value: string | null): string =>
      value === null ? chalk.dim('(hidden for your role)') : show ? value : chalk.dim('••••••');
    let secret: string | undefined;

    if (webhook.hasSecret) {
      secret = mask(webhook.secret);
    }

    printDetails(ctx.client, [
      ['ID', webhook.id],
      ['Name', webhook.name],
      ['Description', webhook.description],
      ['Status', statusLabel(webhook)],
      ['Request', `${webhook.method} ${webhook.url}`],
      ['Events', webhook.events.join(', ')],
      ['Entities', formatEntities(webhook.entities)],
      ...webhook.headers.map((header): [string, string] => [`Header ${header.name}`, mask(header.value)]),
      ['Secret', secret],
      [
        'Deliveries',
        `${String(webhook.deliveries.total)} total, ${String(webhook.deliveries.successful)} succeeded, ${String(
          webhook.deliveries.failed
        )} failed`,
      ],
      [
        'Last call',
        webhook.lastTriggeredAt
          ? `${formatRelativeTime(webhook.lastTriggeredAt)} (${webhook.lastTriggeredAt})`
          : chalk.dim('never'),
      ],
      ['Created', webhook.createdAt ? `${formatRelativeTime(webhook.createdAt)} (${webhook.createdAt})` : undefined],
      ['Created by', webhook.createdByName],
      ['Updated', webhook.updatedAt ? `${formatRelativeTime(webhook.updatedAt)} (${webhook.updatedAt})` : undefined],
    ]);

    if (!show && !hiddenForRole && (webhook.headers.length > 0 || webhook.hasSecret)) {
      ctx.client.output.log(chalk.dim('Pass --show-secrets to print header values and the secret.'));
    }

    return 0;
  },
};

const create: Subcommand = {
  command: webhooksCreateCommand,
  aliases: ['add'],
  needsProject: true,
  flags: { ...EDIT_FLAGS, '--disabled': Boolean },
  async run(ctx) {
    const body = buildCreateBody(readEditFlags(ctx.flags));
    const webhook = requireWebhook(
      await ctx.client.fetch<WebhookMutationResponse>('/webhooks', {
        method: 'POST',
        body: { ...body },
        projectId: ctx.projectId,
      })
    );

    if (ctx.json) {
      printJson(ctx.client, { webhook: redactWebhook(webhook, showSecrets(ctx)) });

      return 0;
    }

    printWebhookLine(ctx, 'Created', webhook);
    ctx.client.output.log(
      chalk.dim(
        `${webhook.method} ${webhook.url} on ${formatEvents(webhook.events)} events of ${formatEntities(
          webhook.entities
        )} entities${webhook.enabled ? '' : ' (disabled)'}.`
      )
    );

    return 0;
  },
};

const update: Subcommand = {
  command: webhooksUpdateCommand,
  aliases: ['edit'],
  needsProject: true,
  flags: { ...EDIT_FLAGS, '--remove-header': [String] as [StringConstructor], '--all-entities': Boolean },
  async run(ctx) {
    const current = await resolveWebhook(ctx, ctx.args[0] as string);
    const body = buildUpdateBody(readEditFlags(ctx.flags), current);

    if (Object.keys(body).length === 0) {
      throw new Error('Nothing to change. Pass at least one option, such as --url or --on. See --help.');
    }

    const webhook = requireWebhook(await patchWebhook(ctx, current.id, body));

    if (ctx.json) {
      printJson(ctx.client, { webhook: redactWebhook(webhook, showSecrets(ctx)) });

      return 0;
    }

    printWebhookLine(ctx, 'Updated', webhook);

    return 0;
  },
};

function toggle(enabled: boolean): Subcommand['run'] {
  return async (ctx) => {
    const webhooks = await resolveWebhooks(ctx);
    const updated: WebhookDto[] = [];

    for (const webhook of webhooks) {
      if (webhook.enabled === enabled) {
        updated.push(webhook);

        if (!ctx.json) {
          ctx.client.output.log(`${webhook.name} is already ${enabled ? 'enabled' : 'disabled'}.`);
        }

        continue;
      }

      const saved = requireWebhook(await patchWebhook(ctx, webhook.id, { enabled }));

      updated.push(saved);

      if (!ctx.json) {
        printWebhookLine(ctx, enabled ? 'Enabled' : 'Disabled', saved);
      }
    }

    if (ctx.json) {
      printJson(ctx.client, { webhooks: updated.map((webhook) => redactWebhook(webhook, showSecrets(ctx))) });
    }

    return 0;
  };
}

const enable: Subcommand = {
  command: webhooksEnableCommand,
  needsProject: true,
  flags: { '--show-secrets': Boolean },
  run: toggle(true),
};
const disable: Subcommand = {
  command: webhooksDisableCommand,
  needsProject: true,
  flags: { '--show-secrets': Boolean },
  run: toggle(false),
};

const rm: Subcommand = {
  command: webhooksRemoveCommand,
  aliases: ['remove', 'delete'],
  needsProject: true,
  async run(ctx) {
    const webhooks = await resolveWebhooks(ctx);
    const label =
      webhooks.length === 1
        ? `the webhook "${(webhooks[0] as WebhookDto).name}"`
        : `${String(webhooks.length)} webhooks (${webhooks.map((webhook) => webhook.name).join(', ')})`;

    if (!(await confirmAction(ctx, `Delete ${label}?`))) {
      return 1;
    }

    for (const webhook of webhooks) {
      await ctx.client.fetch(`/webhooks/${encodeURIComponent(webhook.id)}`, {
        method: 'DELETE',
        projectId: ctx.projectId,
      });

      if (!ctx.json) {
        printWebhookLine(ctx, 'Deleted', webhook);
      }
    }

    if (ctx.json) {
      printJson(ctx.client, { deleted: webhooks.map((webhook) => webhook.id) });
    }

    return 0;
  },
};

export default async function webhooksCommandMain(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: webhooksCommand,
    subcommands: [ls, inspect, create, update, enable, disable, rm],
    defaultSubcommand: 'ls',
  });
}
