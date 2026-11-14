import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import type Client from '../../util/client';
import type { JSONObject } from '../../types';
import { confirmAction, runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import {
  formatRelativeTime,
  formatStatus,
  printDetails,
  printJson,
  printTable,
  truncate,
} from '../../util/output/format';
import { getCommandName } from '../../util/pkg';
import { readJsonInput, readTextInput } from '../../util/read-input';
import humanizePath from '../../util/humanize-path';
import { printRunOutcome, runExitCode } from '../runs/format';
import { getRun, streamRun, waitForRun } from '../runs/stream';
import {
  automationsCommand,
  automationsCreateCommand,
  automationsCreditsCommand,
  automationsDisableCommand,
  automationsEnableCommand,
  automationsInspectCommand,
  automationsListCommand,
  automationsModelsCommand,
  automationsPullCommand,
  automationsPushCommand,
  automationsRemoveCommand,
  automationsRunCommand,
  automationsToolsCommand,
  automationsUpdateCommand,
} from './command';
import {
  buildCreateInput,
  buildUpdateInput,
  describeTrigger,
  describeTriggers,
  isEmptyChange,
  toAutomationInput,
  type AutomationFlagValues,
  type AutomationInput,
} from './input';
import type { Automation, AutomationMutationResult, AutomationsList, AutomationTools, CreditBalance } from './types';

const DEFINITION_FLAGS = {
  '--file': String,
  '-f': '--file',
  '--name': String,
  '--instructions': String,
  '--prompt': '--instructions',
  '-i': '--instructions',
  '--model': String,
  '-m': '--model',
  '--visibility': String,
  '--space': String,
  '--mutation-policy': String,
};

/** Builds the list path from the `ls` flags. */
export function automationsListPath(flags: Record<string, unknown>): string {
  const rawLimit = flags['--limit'] as number | undefined;
  const rawOffset = flags['--offset'] as number | undefined;
  const params = new URLSearchParams({
    limit: (rawLimit && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 25).toString(),
    offset: (rawOffset && rawOffset > 0 ? Math.floor(rawOffset) : 0).toString(),
  });

  if (flags['--enabled'] && flags['--disabled']) {
    throw new Error('Pass either --enabled or --disabled, not both.');
  }

  if (flags['--enabled'] || flags['--disabled']) {
    params.set('enabled', flags['--enabled'] ? 'true' : 'false');
  }

  const search = (flags['--search'] as string | undefined)?.trim();

  if (search) {
    params.set('q', search);
  }

  if (flags['--visibility']) {
    params.set('visibility', flags['--visibility'] as string);
  }

  return `/automations?${params.toString()}`;
}

function automationPath(automationId: string, suffix = ''): string {
  return `/automations/${encodeURIComponent(automationId)}${suffix}`;
}

async function readFlagValues(ctx: SubcommandContext): Promise<AutomationFlagValues> {
  const { flags } = ctx;
  const instructions = flags['--instructions'] as string | undefined;

  if (flags['--enable'] && flags['--disable']) {
    throw new Error('Pass either --enable or --disable, not both.');
  }

  return {
    name: flags['--name'] as string | undefined,
    instructions: instructions === undefined ? undefined : (await readTextInput(ctx.client, instructions)).trim(),
    modelId: flags['--model'] as string | undefined,
    visibility: flags['--visibility'] as string | undefined,
    spaceId: flags['--space'] as string | undefined,
    mutationPolicy: flags['--mutation-policy'] as string | undefined,
    enabled: flags['--enable'] ? true : flags['--disable'] ? false : undefined,
    schedules: flags['--schedule'] as string[] | undefined,
    timezone: flags['--timezone'] as string | undefined,
  };
}

async function readFileFlag(ctx: SubcommandContext): Promise<AutomationInput | undefined> {
  const file = ctx.flags['--file'] as string | undefined;

  if (file === undefined) {
    return undefined;
  }

  const value = await readJsonInput<unknown>(ctx.client, file, 'automation definition');

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('The automation definition must be a JSON object.');
  }

  return value as AutomationInput;
}

async function getAutomation(client: Client, projectId: string, automationId: string): Promise<Automation> {
  const { automation } = await client.fetch<{ automation: Automation }>(automationPath(automationId), { projectId });

  return automation;
}

async function saveAutomation(
  client: Client,
  projectId: string,
  input: AutomationInput,
  automationId?: string
): Promise<AutomationMutationResult> {
  return client.fetch<AutomationMutationResult>(automationId ? automationPath(automationId) : '/automations', {
    method: automationId ? 'PATCH' : 'POST',
    projectId,
    body: input as JSONObject,
  });
}

function printSaved(ctx: SubcommandContext, result: AutomationMutationResult, verb: string): number {
  if (ctx.json) {
    printJson(ctx.client, result);

    return 0;
  }

  const { automation } = result;

  if (automation) {
    ctx.client.output.success(
      `${verb} ${chalk.bold(automation.name)} (${automation.id}), ${automation.enabled ? 'enabled' : 'disabled'}.`
    );
  } else {
    ctx.client.output.success(`${verb} the automation.`);
  }

  return 0;
}

function printAutomation(client: Client, automation: Automation): void {
  printDetails(client, [
    ['ID', automation.id],
    ['Name', automation.name],
    ['Status', formatStatus(automation.enabled ? 'enabled' : 'disabled')],
    ['Model', automation.modelId],
    ['Visibility', automation.visibility === 'space' ? `space ${automation.spaceId ?? ''}` : automation.visibility],
    ['Data changes', automation.mutationPolicy === 'auto_approve' ? 'auto-approve' : 'require approval'],
    ['Notify', `${automation.notifyRule}${automation.notifyCreator ? ' (creator)' : ''}`],
    ['Custom tools', automation.customToolNames.join(', ')],
    ['Skills', automation.skillIds?.join(', ')],
    ['Runs', automation.totalRuns],
    ['Last run', automation.lastRunAt ? formatRelativeTime(automation.lastRunAt) : 'never'],
    ['Created', automation.createdAt ? formatRelativeTime(automation.createdAt) : ''],
    ['Updated', automation.updatedAt ? formatRelativeTime(automation.updatedAt) : ''],
  ]);

  client.output.print(`${chalk.dim('Triggers')}\n`);

  if (automation.triggers.length === 0) {
    client.output.print('  manual only\n');
  }

  for (const trigger of automation.triggers) {
    client.output.print(`  ${describeTrigger(trigger)}${describeTriggerUrl(trigger)}\n`);
  }

  client.output.print(`\n${chalk.dim('Instructions')}\n${automation.instructions}\n\n`);
}

/** The URL of a webhook trigger. The server withholds it from people who cannot manage automations. */
function describeTriggerUrl(trigger: { type?: unknown; url?: unknown }): string {
  if (typeof trigger.url === 'string' && trigger.url) {
    return `  ${chalk.cyan(trigger.url)}`;
  }

  return trigger.type === 'webhook' ? `  ${chalk.dim('(URL visible to project owners and developers)')}` : '';
}

const ls: Subcommand = {
  command: automationsListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: {
    '--enabled': Boolean,
    '--disabled': Boolean,
    '--search': String,
    '-q': '--search',
    '--visibility': String,
    '--limit': Number,
    '-n': '--limit',
    '--offset': Number,
  },
  async run(ctx) {
    const { client, projectId } = ctx;
    client.output.spinner('Loading automations');
    const res = await client.fetch<AutomationsList>(automationsListPath(ctx.flags), { projectId });
    client.output.stopSpinner();

    if (ctx.json) {
      printJson(client, res);

      return 0;
    }

    printTable(
      client,
      ['ID', 'NAME', 'STATUS', 'TRIGGERS', 'RUNS', 'LAST RUN'],
      res.automations.map((automation) => [
        automation.id,
        truncate(automation.name, 36),
        formatStatus(automation.enabled ? 'enabled' : 'disabled'),
        truncate(describeTriggers(automation.triggers), 36),
        automation.totalRuns.toString(),
        automation.lastRunAt ? formatRelativeTime(automation.lastRunAt) : chalk.dim('never'),
      ]),
      'No automations found.'
    );

    if (res.hasMore) {
      const offset = (ctx.flags['--offset'] as number | undefined) ?? 0;
      client.output.dim(
        `Showing ${res.automations.length.toString()} of ${res.count.toString()}: pass --offset ${(offset + res.automations.length).toString()} for more.`
      );
    }

    return 0;
  },
};

const inspect: Subcommand = {
  command: automationsInspectCommand,
  aliases: ['get'],
  needsProject: true,
  async run(ctx) {
    const res = await ctx.client.fetch<{ automation: Automation }>(automationPath(ctx.args[0] as string), {
      projectId: ctx.projectId,
    });

    if (ctx.json) {
      printJson(ctx.client, res);

      return 0;
    }

    printAutomation(ctx.client, res.automation);

    return 0;
  },
};

const create: Subcommand = {
  command: automationsCreateCommand,
  aliases: ['add'],
  needsProject: true,
  flags: {
    ...DEFINITION_FLAGS,
    '--schedule': [String] as [StringConstructor],
    '--timezone': String,
    '--enable': Boolean,
  },
  async run(ctx) {
    const input = buildCreateInput(await readFileFlag(ctx), await readFlagValues(ctx));
    const result = await saveAutomation(ctx.client, ctx.projectId, input);

    return printSaved(ctx, result, 'Created');
  },
};

const update: Subcommand = {
  command: automationsUpdateCommand,
  needsProject: true,
  flags: { ...DEFINITION_FLAGS, '--enable': Boolean, '--disable': Boolean },
  async run(ctx) {
    const automationId = ctx.args[0] as string;
    const file = await readFileFlag(ctx);
    const flagValues = await readFlagValues(ctx);

    if (isEmptyChange(file, flagValues)) {
      ctx.client.output.error(
        `Nothing to change. Pass --file or a flag like --name; run ${getCommandName('automations update --help')} for the list.`
      );

      return 1;
    }

    const current = await getAutomation(ctx.client, ctx.projectId, automationId);
    const result = await saveAutomation(
      ctx.client,
      ctx.projectId,
      buildUpdateInput(current, file, flagValues),
      automationId
    );

    return printSaved(ctx, result, 'Updated');
  },
};

function toggle(enabled: boolean): Subcommand['run'] {
  return async (ctx) => {
    const automationId = ctx.args[0] as string;
    const current = await getAutomation(ctx.client, ctx.projectId, automationId);

    if (current.enabled === enabled && !ctx.json) {
      ctx.client.output.log(`${current.name} is already ${enabled ? 'enabled' : 'disabled'}.`);

      return 0;
    }

    const result = await saveAutomation(
      ctx.client,
      ctx.projectId,
      buildUpdateInput(current, undefined, { enabled }),
      automationId
    );

    return printSaved(ctx, result, enabled ? 'Enabled' : 'Disabled');
  };
}

const enable: Subcommand = { command: automationsEnableCommand, needsProject: true, run: toggle(true) };
const disable: Subcommand = { command: automationsDisableCommand, needsProject: true, run: toggle(false) };

const rm: Subcommand = {
  command: automationsRemoveCommand,
  aliases: ['remove'],
  needsProject: true,
  async run(ctx) {
    const automationId = ctx.args[0] as string;
    const current = await getAutomation(ctx.client, ctx.projectId, automationId);

    if (!(await confirmAction(ctx, `Delete automation "${current.name}" (${automationId})?`))) {
      return 1;
    }

    const result = await ctx.client.fetch<{ success: boolean }>(automationPath(automationId), {
      method: 'DELETE',
      projectId: ctx.projectId,
    });

    if (ctx.json) {
      printJson(ctx.client, result);

      return 0;
    }

    ctx.client.output.success(`Deleted automation ${chalk.bold(current.name)} (${automationId}).`);

    return 0;
  },
};

const run: Subcommand = {
  command: automationsRunCommand,
  needsProject: true,
  flags: { '--follow': Boolean, '-f': '--follow', '--wait': Boolean, '-w': '--wait' },
  async run(ctx) {
    const { client, projectId } = ctx;
    const automationId = ctx.args[0] as string;
    const follow = Boolean(ctx.flags['--follow']);
    const wait = Boolean(ctx.flags['--wait']);

    if (follow && wait) {
      client.output.error('Pass either --follow or --wait, not both.');

      return 1;
    }

    const started = await client.fetch<{ runId?: string; success: boolean }>(automationPath(automationId, '/runs'), {
      method: 'POST',
      projectId,
    });

    if (!started.runId) {
      client.output.error('The run did not start.');

      return 1;
    }

    if (!follow && !wait) {
      if (ctx.json) {
        printJson(client, started);
      } else {
        client.output.success(`Started run ${chalk.bold(started.runId)}.`);
        client.output.dim(`Follow it with ${getCommandName(`runs logs ${started.runId} --follow`)}.`);
      }

      return 0;
    }

    if (!ctx.json) {
      client.output.log(`Started run ${chalk.bold(started.runId)}.`);
    }

    let final;

    if (follow) {
      final = await streamRun(client, projectId, await getRun(client, projectId, started.runId), {
        follow: true,
        json: ctx.json,
      });
    } else {
      if (!ctx.json) {
        client.output.spinner('Waiting for the run to finish');
      }

      final = await waitForRun(client, projectId, started.runId);
      client.output.stopSpinner();
    }

    if (ctx.json) {
      if (wait) {
        printJson(client, { run: final });
      }
    } else {
      if (wait && final.summary) {
        client.stdout.write(`${final.summary}\n`);
      }

      printRunOutcome(client, final);
    }

    return runExitCode(final);
  },
};

const tools: Subcommand = {
  command: automationsToolsCommand,
  needsProject: true,
  async run(ctx) {
    const { client, projectId } = ctx;
    const automationId = ctx.args[0] as string;
    const [automation, res] = await Promise.all([
      getAutomation(client, projectId, automationId),
      client.fetch<{ tools: AutomationTools }>(automationPath(automationId, '/tools'), { projectId }),
    ]);
    const attached = new Set(automation.customToolNames);

    if (ctx.json) {
      printJson(client, {
        customToolNames: automation.customToolNames,
        skillIds: automation.skillIds ?? [],
        toolConfigs: automation.toolConfigs ?? [],
        available: { customTools: res.tools.customTools, providers: res.tools.providers },
      });

      return 0;
    }

    client.output.print(`${chalk.dim('Custom tools')}\n`);
    printTable(
      client,
      ['NAME', 'ATTACHED', 'DESCRIPTION'],
      res.tools.customTools.tools.map((tool) => [
        tool.name,
        attached.has(tool.name) ? chalk.green('yes') : chalk.dim('no'),
        truncate(tool.description, 60),
      ]),
      'The project has no custom tools.'
    );

    const configs = (automation.toolConfigs ?? []) as {
      pluginId: string;
      enabled: boolean;
      allTools: boolean;
      selectedTools: string[];
      connectionMode: string;
    }[];

    client.output.print(`${chalk.dim('Plugins')}\n`);
    printTable(
      client,
      ['PLUGIN', 'STATUS', 'TOOLS', 'CONNECTION'],
      configs.map((config) => [
        config.pluginId,
        formatStatus(config.enabled ? 'enabled' : 'disabled'),
        config.allTools ? 'all' : truncate(config.selectedTools.join(', '), 48) || chalk.dim('none'),
        config.connectionMode,
      ]),
      'No plugins attached.'
    );

    for (const [provider, data] of Object.entries(res.tools.providers)) {
      if (data.enabled) {
        client.output.log(`Delivers to ${provider}: ${data.channels.map((channel) => `#${channel.name}`).join(', ')}`);
      }
    }

    if (automation.skillIds && automation.skillIds.length > 0) {
      client.output.log(`Skills: ${automation.skillIds.join(', ')}`);
    }

    return 0;
  },
};

const models: Subcommand = {
  command: automationsModelsCommand,
  needsProject: true,
  async run(ctx) {
    const { tools: toolsData } = await ctx.client.fetch<{ tools: AutomationTools }>('/automations/tools', {
      projectId: ctx.projectId,
    });

    if (ctx.json) {
      printJson(ctx.client, { models: toolsData.models });

      return 0;
    }

    printTable(
      ctx.client,
      ['ID', 'NAME', 'EFFORTS', ''],
      toolsData.models.map((model) => [
        model.id,
        model.name,
        model.efforts.join(', '),
        model.deprecated ? chalk.yellow('deprecated') : '',
      ])
    );
    ctx.client.output.dim('Pass another effort as <model>:<effort>, for example anthropic/claude-opus-5.5:high.');

    return 0;
  },
};

const credits: Subcommand = {
  command: automationsCreditsCommand,
  needsProject: true,
  async run(ctx) {
    const res = await ctx.client.fetch<{ creditBalance: CreditBalance }>('/automations/credits', {
      projectId: ctx.projectId,
    });

    if (ctx.json) {
      printJson(ctx.client, res);

      return 0;
    }

    const balance = res.creditBalance;
    printDetails(ctx.client, [
      ['Balance', balance.isLowBalance ? chalk.yellow(`${balance.display} (low)`) : balance.display],
      ['Top up', balance.billingUrl],
    ]);

    return 0;
  },
};

const pull: Subcommand = {
  command: automationsPullCommand,
  needsProject: true,
  async run(ctx) {
    const [automationId, file] = ctx.args as [string, string | undefined];
    const automation = await getAutomation(ctx.client, ctx.projectId, automationId);
    const definition = { id: automation.id, ...toAutomationInput(automation) };
    const text = `${JSON.stringify(definition, null, 2)}\n`;

    if (!file || file === '-') {
      ctx.client.stdout.write(text);

      return 0;
    }

    const target = path.resolve(ctx.client.cwd, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
    ctx.client.output.success(`Saved ${chalk.bold(automation.name)} to ${humanizePath(target)}.`);

    if (automation.triggers.some((trigger) => trigger.type === 'webhook' && trigger.secret)) {
      ctx.client.output.warn('The file contains a webhook secret; keep it out of public repositories.');
    }

    return 0;
  },
};

const push: Subcommand = {
  command: automationsPushCommand,
  needsProject: true,
  flags: { '--create': Boolean },
  async run(ctx) {
    const definition = await readJsonInput<AutomationInput>(ctx.client, ctx.args[0] as string, 'automation definition');

    if (typeof definition !== 'object' || definition === null || Array.isArray(definition)) {
      throw new Error('The automation definition must be a JSON object.');
    }

    const id = typeof definition.id === 'string' && !ctx.flags['--create'] ? definition.id : undefined;

    if (!id) {
      const result = await saveAutomation(ctx.client, ctx.projectId, buildCreateInput(definition, {}));

      return printSaved(ctx, result, 'Created');
    }

    const current = await getAutomation(ctx.client, ctx.projectId, id);
    const result = await saveAutomation(ctx.client, ctx.projectId, buildUpdateInput(current, definition, {}), id);

    return printSaved(ctx, result, 'Updated');
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: automationsCommand,
    subcommands: [ls, inspect, create, update, enable, disable, rm, run, tools, models, credits, pull, push],
    defaultSubcommand: 'ls',
  });
}
