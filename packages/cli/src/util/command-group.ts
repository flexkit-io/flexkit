import type arg from 'arg';
import parseArguments from './parse-args';
import type Client from './client';
import { help, type Command } from '../commands/help';
import { getCommandName } from './pkg';
import { isAPIError } from './error-utils';
import { resolveProjectId } from './project-context';

type ArgSpec = arg.Spec;
type Flags = Record<string, unknown>;

export interface SubcommandContext {
  client: Client;
  /** Positional arguments after the subcommand name. */
  args: string[];
  /** Every parsed flag, keyed by its long name (`--json`, `--limit`, …). */
  flags: Flags;
  /** Set when the subcommand declares `needsProject`. */
  projectId: string;
  json: boolean;
  /** `--yes`: skip confirmation prompts. */
  yes: boolean;
}

export interface Subcommand {
  /** Help metadata; `name` is the subcommand name. */
  command: Command;
  /** Extra names that run this subcommand (`list` for `ls`, `remove` for `rm`, …). */
  aliases?: string[];
  /** Flags this subcommand accepts on top of the shared ones. */
  flags?: ArgSpec;
  /** Resolve the target project (`--project`, env, link or config) before running. */
  needsProject?: boolean;
  run: (ctx: SubcommandContext) => Promise<number>;
}

export interface CommandGroup {
  command: Command;
  subcommands: Subcommand[];
  /** Subcommand to run when none is given (for example `ls`). */
  defaultSubcommand?: string;
}

/** Flags every command group accepts. */
export const SHARED_FLAGS = {
  '--help': Boolean,
  '-h': '--help',
  '--json': Boolean,
  '--yes': Boolean,
  '-y': '--yes',
  '--project': String,
  '-p': '--project',
} satisfies ArgSpec;

/** Returns a copy of a subcommand's help metadata with the parent name in its synopsis. */
function withParent(command: Command, parent: string): Command {
  return { ...command, parent };
}

function findSubcommand(group: CommandGroup, name: string): Subcommand | undefined {
  return group.subcommands.find((sub) => sub.command.name === name || sub.aliases?.includes(name));
}

/**
 * Turns an API failure into a readable message. Flexkit routes answer with
 * `{ error }`, `{ errorMessage }` (string or list) or `{ message }`.
 */
export function getApiErrorMessage(err: unknown): string {
  if (!isAPIError(err)) {
    return err instanceof Error ? err.message : String(err);
  }

  // responseError already read the body's message (getErrorBodyMessage).
  if (typeof err.serverMessage === 'string' && err.serverMessage !== 'Response Error') {
    return err.serverMessage;
  }

  return err.message;
}

/** Prints an API or runtime error in the shared style and returns exit code 1. */
export function reportError(client: Client, err: unknown): number {
  const { output } = client;

  if (err instanceof Error && err.message === 'User force closed the prompt with 0 null') {
    return 1;
  }

  if (isAPIError(err)) {
    if (err.status === 401) {
      output.error(`You are not logged in, or your token expired. Run ${getCommandName('login')} and try again.`);

      return 1;
    }

    if (err.status === 403) {
      const message = getApiErrorMessage(err);

      if (message === 'A user session is required.') {
        output.error(
          `This command needs a person's session, not an API token. Run ${getCommandName(
            'login'
          )} and try again without FLEXKIT_TOKEN or --token.`
        );

        return 1;
      }
      output.error(
        message && message !== 'Forbidden'
          ? message
          : "Your role in this project doesn't allow this action. Ask a project owner for access."
      );

      return 1;
    }

    if (err.status === 404) {
      const message = getApiErrorMessage(err);
      output.error(message && message !== 'Not Found' ? message : 'Not found.');

      return 1;
    }
  }

  output.error(getApiErrorMessage(err));

  if (err instanceof Error && err.stack) {
    output.debug(err.stack);
  }

  return 1;
}

/**
 * Runs `flexkit <group> <subcommand> [args] [flags]`: parses the shared and the
 * subcommand's flags, prints help, resolves the project and reports errors.
 */
/** Compares flag specs by meaning: `[String]` literals in two subcommands are equal. */
function specKey(spec: unknown): string {
  if (Array.isArray(spec)) {
    return `[${spec.map(specKey).join(',')}]`;
  }

  return typeof spec === 'function' ? `fn:${spec.name}` : String(spec);
}

/**
 * The flags of every subcommand, for finding the subcommand name. A flag that
 * subcommands define differently (`-f` as `--file` in one and `--follow` in
 * another) is left out, so it can't take the wrong number of values.
 */
export function firstPassFlags(subcommands: Pick<Subcommand, 'flags'>[]): typeof SHARED_FLAGS {
  const merged: { [flag: string]: unknown } = {};
  const conflicting = new Set<string>();

  for (const sub of subcommands) {
    for (const [flag, spec] of Object.entries(sub.flags ?? {})) {
      if (flag in merged && specKey(merged[flag]) !== specKey(spec)) {
        conflicting.add(flag);
      }

      merged[flag] = spec;
    }
  }

  for (const flag of conflicting) {
    delete merged[flag];
  }

  return { ...merged, ...SHARED_FLAGS } as typeof SHARED_FLAGS;
}

export async function runCommandGroup(client: Client, group: CommandGroup): Promise<number> {
  const { output } = client;
  const { columns } = client.stderr;
  const rawArgs = client.argv.slice(2);

  // First pass: find the subcommand name. It knows the subcommands' flags, so a
  // flag value before the subcommand (`logs --since 1h`) isn't read as its name.
  const allFlags = firstPassFlags(group.subcommands);
  let firstPass;

  try {
    firstPass = parseArguments(rawArgs, allFlags, { permissive: true });
  } catch (err: unknown) {
    output.error(err instanceof Error ? err.message : String(err));

    return 1;
  }

  const [, requestedName] = firstPass.args;
  const subName = requestedName ?? group.defaultSubcommand;
  const sub = subName ? findSubcommand(group, subName) : undefined;

  if (!sub) {
    if (firstPass.flags['--help'] || !subName) {
      output.print(help(group.command, { columns }));

      return firstPass.flags['--help'] ? 2 : 1;
    }

    output.error(
      `Unknown subcommand "${subName}". Run ${getCommandName(`${group.command.name} --help`)} to see the available ones.`
    );

    return 1;
  }

  if (firstPass.flags['--help']) {
    output.print(help(requestedName ? withParent(sub.command, group.command.name) : group.command, { columns }));

    return 2;
  }

  let parsed;

  try {
    parsed = parseArguments(rawArgs, { ...SHARED_FLAGS, ...(sub.flags ?? {}) });
  } catch (err: unknown) {
    output.error(
      `${err instanceof Error ? err.message : String(err)}. Run ${getCommandName(
        `${group.command.name} ${sub.command.name} --help`
      )} for usage.`
    );

    return 1;
  }

  const args = parsed.args.slice(requestedName ? 2 : 1);
  const flags = parsed.flags as Flags;
  const missing = sub.command.arguments.filter((argument, index) => argument.required && args[index] === undefined);

  if (missing.length > 0) {
    output.error(
      `Missing ${missing.map((argument) => `<${argument.name}>`).join(' ')}. Run ${getCommandName(
        `${group.command.name} ${sub.command.name} --help`
      )} for usage.`
    );

    return 1;
  }

  let projectId = '';

  if (sub.needsProject) {
    const resolved = resolveProjectId(client, flags['--project'] as string | undefined);

    if (!resolved) {
      return 1;
    }

    ({ projectId } = resolved);
    output.debug(`Using project ${projectId} (from ${resolved.source})`);
  }

  try {
    return await sub.run({
      client,
      args,
      flags,
      projectId,
      json: Boolean(flags['--json']),
      yes: Boolean(flags['--yes']),
    });
  } catch (err: unknown) {
    output.stopSpinner();

    return reportError(client, err);
  }
}

/**
 * Asks for confirmation before a destructive action. `--yes` skips the prompt;
 * without a TTY the action is refused so scripts never hang on a question.
 */
export async function confirmAction(ctx: SubcommandContext, message: string): Promise<boolean> {
  if (ctx.yes) {
    return true;
  }

  if (!ctx.client.stdin.isTTY) {
    ctx.client.output.error(`${message} Pass --yes to confirm when running without a terminal.`);

    return false;
  }

  const confirmed = await ctx.client.input.confirm({ message, default: false });

  if (!confirmed) {
    ctx.client.output.log('Canceled.');
  }

  return confirmed;
}
