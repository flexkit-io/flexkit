import chalk from 'chalk';
import type Client from '../../util/client';
import { confirmAction, runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import { printJson, printTable } from '../../util/output/format';
import { tokensCommand, tokensCreateCommand, tokensListCommand, tokensRemoveCommand } from './command';
import { buildCreateTokenBody, describeTokenSpaces, findToken, tokenRows, type TokenDto } from './tokens';

interface CreateTokenResponse {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  token?: TokenDto;
}

async function fetchTokens(ctx: SubcommandContext): Promise<TokenDto[]> {
  const { tokens } = await ctx.client.fetch<{ tokens: TokenDto[] }>('/tokens', { projectId: ctx.projectId });

  return tokens;
}

const ls: Subcommand = {
  command: tokensListCommand,
  aliases: ['list'],
  needsProject: true,
  async run(ctx) {
    const tokens = await fetchTokens(ctx);

    if (ctx.json) {
      printJson(ctx.client, { tokens });

      return 0;
    }

    printTable(
      ctx.client,
      ['ID', 'NAME', 'ROLE', 'SPACES', 'TOKEN', 'CREATED BY', 'CREATED'],
      tokenRows(tokens),
      'No API tokens yet. Create one with `flexkit tokens create <name>`.'
    );

    return 0;
  },
};

const create: Subcommand = {
  command: tokensCreateCommand,
  aliases: ['add'],
  needsProject: true,
  flags: {
    '--role': String,
    '-r': '--role',
    '--space': [String] as [StringConstructor],
    '-s': '--space',
  },
  async run(ctx) {
    const body = buildCreateTokenBody({
      name: ctx.args[0],
      role: ctx.flags['--role'] as string | undefined,
      spaces: ctx.flags['--space'] as string[] | undefined,
    });
    const result = await ctx.client.fetch<CreateTokenResponse>('/tokens', {
      method: 'POST',
      body: { ...body },
      projectId: ctx.projectId,
    });

    if (!result.success || !result.token?.value) {
      throw new Error(result.errorMessage || 'The token could not be created.');
    }

    const { token } = result;

    if (ctx.json) {
      printJson(ctx.client, { token });

      return 0;
    }

    const { output } = ctx.client;

    output.success(
      `Created token ${chalk.bold(token.name)} ${chalk.dim(`(id ${String(token.id)}, ${token.role.toLowerCase()}, spaces: ${describeTokenSpaces(token.spaces)})`)}`
    );
    output.warn("Copy the token now: it won't be shown again.");
    // The secret alone on stdout, so `$(flexkit tokens create …)` and pipes get just the token.
    ctx.client.stdout.write(`${token.value}\n`);
    output.log(
      `Use it in CI with ${chalk.cyan('FLEXKIT_TOKEN=<token>')}, or as ${chalk.cyan('Authorization: Bearer <token>')}.`
    );

    return 0;
  },
};

const rm: Subcommand = {
  command: tokensRemoveCommand,
  aliases: ['remove', 'revoke'],
  needsProject: true,
  async run(ctx) {
    const token = findToken(await fetchTokens(ctx), ctx.args[0] as string);
    const digits = token.last_digits ? ` ****${token.last_digits}` : '';

    if (
      !(await confirmAction(
        ctx,
        `Revoke the token "${token.name}" (id ${String(token.id)}${digits})? Apps and scripts that use it stop working.`
      ))
    ) {
      return 1;
    }

    await ctx.client.fetch<{ success: boolean }>(`/tokens/${String(token.id)}`, {
      method: 'DELETE',
      projectId: ctx.projectId,
    });

    if (ctx.json) {
      printJson(ctx.client, { deleted: true, id: token.id });

      return 0;
    }

    ctx.client.output.success(`Revoked token ${chalk.bold(token.name)} ${chalk.dim(`(id ${String(token.id)})`)}`);

    return 0;
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: tokensCommand,
    subcommands: [ls, create, rm],
    defaultSubcommand: 'ls',
  });
}
