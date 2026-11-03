import chalk from 'chalk';
import type Client from '../../util/client';
import { confirmAction, runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import { formatRelativeTime, printJson, printTable } from '../../util/output/format';
import { corsAddCommand, corsCommand, corsListCommand, corsRemoveCommand } from './command';
import { checkOrigin, normalizeOrigin, planCorsAdd, resolveCorsTargets, type CorsOriginDto } from './cors';

async function listOrigins(ctx: SubcommandContext): Promise<CorsOriginDto[]> {
  const { origins } = await ctx.client.fetch<{ origins: CorsOriginDto[] }>('/cors', { projectId: ctx.projectId });

  return origins;
}

const ls: Subcommand = {
  command: corsListCommand,
  aliases: ['list'],
  needsProject: true,
  async run(ctx) {
    const origins = await listOrigins(ctx);

    if (ctx.json) {
      printJson(ctx.client, { origins });

      return 0;
    }

    printTable(
      ctx.client,
      ['ID', 'ORIGIN', 'CREDENTIALS', 'ADDED'],
      origins.map((origin) => [
        chalk.dim(String(origin.id)),
        origin.origin,
        origin.allowCredentials ? 'allowed' : chalk.dim('no'),
        formatRelativeTime(origin.createdAt),
      ]),
      'No origins yet: browsers cannot call the project API. Allow one with `flexkit cors add <origin>`.'
    );

    return 0;
  },
};

const add: Subcommand = {
  command: corsAddCommand,
  aliases: ['allow'],
  needsProject: true,
  flags: { '--credentials': Boolean },
  async run(ctx) {
    const plan = planCorsAdd(await listOrigins(ctx), ctx.args);

    if (plan.invalid.length > 0) {
      throw new Error(plan.invalid.map((value) => checkOrigin(normalizeOrigin(value))).join('\n'));
    }

    const added: CorsOriginDto[] = [];

    for (const origin of plan.add) {
      const result = await ctx.client.fetch<{ origin: CorsOriginDto }>('/cors', {
        method: 'POST',
        body: { origin, allowCredentials: Boolean(ctx.flags['--credentials']) },
        projectId: ctx.projectId,
      });

      added.push(result.origin);

      if (!ctx.json) {
        ctx.client.output.success(
          `Allowed ${chalk.bold(result.origin.origin)} ${chalk.dim(`(${String(result.origin.id)})`)}`
        );
      }
    }

    if (ctx.json) {
      printJson(ctx.client, { added, skipped: plan.skipped });

      return 0;
    }

    for (const origin of plan.skipped) {
      ctx.client.output.log(`${origin.origin} is already allowed.`);
    }

    if (ctx.flags['--credentials'] && plan.skipped.some((origin) => !origin.allowCredentials)) {
      ctx.client.output.log(
        chalk.dim('Already listed origins keep their credentials setting; remove and add them again to change it.')
      );
    }

    return 0;
  },
};

const rm: Subcommand = {
  command: corsRemoveCommand,
  aliases: ['remove'],
  needsProject: true,
  async run(ctx) {
    const { targets, unknown } = resolveCorsTargets(await listOrigins(ctx), ctx.args);

    if (unknown.length > 0) {
      throw new Error(
        `Not in the allowlist: ${unknown.join(', ')}. Run \`flexkit cors ls\` to see the origins and their ids.`
      );
    }

    const label = targets.map((origin) => origin.origin).join(', ');

    if (!(await confirmAction(ctx, `Remove ${label} from the CORS allowlist?`))) {
      return 1;
    }

    for (const origin of targets) {
      await ctx.client.fetch(`/cors/${String(origin.id)}`, { method: 'DELETE', projectId: ctx.projectId });

      if (!ctx.json) {
        ctx.client.output.success(`Removed ${chalk.bold(origin.origin)}`);
      }
    }

    if (ctx.json) {
      printJson(ctx.client, { removed: targets });
    }

    return 0;
  },
};

export default async function corsCommandMain(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: corsCommand,
    subcommands: [ls, add, rm],
    defaultSubcommand: 'ls',
  });
}
