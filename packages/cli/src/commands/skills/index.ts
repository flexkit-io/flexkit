import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import type Client from '../../util/client';
import { confirmAction, runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import { formatRelativeTime, printDetails, printJson, printTable, truncate } from '../../util/output/format';
import { readStdin } from '../../util/read-input';
import {
  skillsAddCommand,
  skillsCommand,
  skillsForkCommand,
  skillsInspectCommand,
  skillsListCommand,
  skillsPullCommand,
  skillsPushCommand,
  skillsRemoveCommand,
  skillsUpdateCommand,
} from './command';
import {
  assignPullFilenames,
  nameFromFilename,
  parseSkillMarkdown,
  parseVisibility,
  planSkillPush,
  skillToMarkdown,
  toSkillInput,
  validateSkillInput,
  type LocalSkill,
  type PushAction,
  type SkillDto,
  type SkillInput,
} from './markdown';

interface SkillsListResponse {
  count: number;
  hasMore: boolean;
  skills: SkillDto[];
}

interface SkillMutationResponse {
  success: boolean;
  errorCode: string;
  errorMessage: string | string[];
  skill?: SkillDto;
}

const DEFAULT_DIR = 'skills';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sourceLabel(skill: SkillDto): string {
  if (skill.source === 'code') {
    return chalk.cyan('code');
  }

  return skill.source === 'plugin' ? chalk.magenta('plugin') : 'studio';
}

/** Every skill the caller can see, page by page (the API caps a page at 100). */
async function fetchAllSkills(ctx: SubcommandContext): Promise<SkillDto[]> {
  const skills: SkillDto[] = [];

  for (let offset = 0; ; offset += 100) {
    const page = await ctx.client.fetch<SkillsListResponse>(`/skills?limit=100&offset=${String(offset)}`, {
      projectId: ctx.projectId,
    });

    skills.push(...page.skills);

    if (!page.hasMore || page.skills.length === 0) {
      return skills;
    }
  }
}

/** Finds a skill by id, else by exact (case-insensitive) name. */
async function resolveSkill(ctx: SubcommandContext, idOrName: string): Promise<SkillDto> {
  if (UUID_PATTERN.test(idOrName)) {
    const { skill } = await ctx.client.fetch<{ skill: SkillDto }>(`/skills/${encodeURIComponent(idOrName)}`, {
      projectId: ctx.projectId,
    });

    return skill;
  }

  const wanted = idOrName.toLowerCase();
  const matches = (await fetchAllSkills(ctx)).filter((skill) => skill.name.toLowerCase() === wanted);

  if (matches.length === 0) {
    throw new Error(`No skill named "${idOrName}". Run \`flexkit skills ls\` to see the skills you can use.`);
  }

  if (matches.length > 1) {
    throw new Error(
      `Several skills are named "${idOrName}": ${matches.map((skill) => skill.id).join(', ')}. Pass the id instead.`
    );
  }

  return matches[0] as SkillDto;
}

async function readMarkdownArgument(client: Client, value: string): Promise<{ text: string; file: string }> {
  if (value === '-') {
    return { text: await readStdin(client), file: 'stdin' };
  }

  const filePath = path.resolve(client.cwd, value.startsWith('@') ? value.slice(1) : value);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`File not found: ${value}`);
  }

  return { text: fs.readFileSync(filePath, 'utf8'), file: filePath };
}

/** Applies --name, --description, --visibility and --space over a skill read from a file. */
function applyFlags(local: LocalSkill, flags: Record<string, unknown>): LocalSkill {
  const space = flags['--space'] as string | undefined;
  const visibility = parseVisibility(flags['--visibility'] as string | undefined, '--visibility');

  return {
    ...local,
    name: (flags['--name'] as string | undefined)?.trim() || local.name,
    description: (flags['--description'] as string | undefined)?.trim() || local.description,
    visibility: visibility ?? (space ? 'space' : local.visibility),
    spaceId: space ?? local.spaceId,
  };
}

function printSkillLine(ctx: SubcommandContext, verb: string, skill: SkillDto): void {
  ctx.client.output.success(`${verb} skill ${chalk.bold(skill.name)} ${chalk.dim(`(${skill.id})`)}`);
}

function requireSkill(response: SkillMutationResponse): SkillDto {
  if (!response.success || !response.skill) {
    const message = Array.isArray(response.errorMessage) ? response.errorMessage.join('\n') : response.errorMessage;

    throw new Error(message || 'The skill could not be saved.');
  }

  return response.skill;
}

function createSkill(ctx: SubcommandContext, input: SkillInput): Promise<SkillMutationResponse> {
  return ctx.client.fetch<SkillMutationResponse>('/skills', {
    method: 'POST',
    body: { ...input },
    projectId: ctx.projectId,
  });
}

function updateSkill(ctx: SubcommandContext, id: string, input: SkillInput): Promise<SkillMutationResponse> {
  return ctx.client.fetch<SkillMutationResponse>(`/skills/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { ...input },
    projectId: ctx.projectId,
  });
}

function deleteSkill(ctx: SubcommandContext, id: string): Promise<SkillMutationResponse> {
  return ctx.client.fetch<SkillMutationResponse>(`/skills/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    projectId: ctx.projectId,
  });
}

function readOnlyHint(skill: SkillDto): string {
  return `"${skill.name}" is managed by ${skill.source === 'plugin' ? 'a plugin' : 'code (flexkit.tools.ts)'}. Run \`flexkit skills fork ${skill.id}\` to get an editable copy.`;
}

const ls: Subcommand = {
  command: skillsListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: {
    '--search': String,
    '-s': '--search',
    '--visibility': String,
    '--limit': Number,
    '-n': '--limit',
    '--offset': Number,
  },
  async run(ctx) {
    const params = new URLSearchParams();
    const search = ctx.flags['--search'] as string | undefined;
    const visibility = ctx.flags['--visibility'] as string | undefined;
    const limit = ctx.flags['--limit'] as number | undefined;
    const offset = ctx.flags['--offset'] as number | undefined;

    if (search) {
      params.set('q', search);
    }

    if (visibility) {
      for (const value of visibility.split(',')) {
        parseVisibility(value.trim(), '--visibility');
      }

      params.set('visibility', visibility);
    }

    if (limit !== undefined) {
      params.set('limit', String(limit));
    }

    if (offset !== undefined) {
      params.set('offset', String(offset));
    }

    const query = params.toString();
    const result = await ctx.client.fetch<SkillsListResponse>(`/skills${query ? `?${query}` : ''}`, {
      projectId: ctx.projectId,
    });

    if (ctx.json) {
      printJson(ctx.client, result);

      return 0;
    }

    printTable(
      ctx.client,
      ['ID', 'NAME', 'SOURCE', 'VISIBILITY', 'UPDATED', 'DESCRIPTION'],
      result.skills.map((skill) => [
        chalk.dim(skill.id),
        skill.name,
        sourceLabel(skill),
        skill.visibility,
        formatRelativeTime(skill.updatedAt),
        truncate(skill.description, 50),
      ]),
      search ? 'No skills match the search.' : 'No skills yet. Create one with `flexkit skills add <file.md>`.'
    );

    if (result.hasMore) {
      const shown = (offset ?? 0) + result.skills.length;

      ctx.client.output.log(
        chalk.dim(
          `Showing ${String(shown)} of ${String(result.count)}. Use --offset ${String(shown)} for the next page.`
        )
      );
    }

    return 0;
  },
};

const inspect: Subcommand = {
  command: skillsInspectCommand,
  aliases: ['get'],
  needsProject: true,
  flags: { '--content': Boolean },
  async run(ctx) {
    const skill = await resolveSkill(ctx, ctx.args[0] as string);

    if (ctx.json) {
      printJson(ctx.client, { skill });

      return 0;
    }

    if (ctx.flags['--content']) {
      ctx.client.stdout.write(`${skill.content.trimEnd()}\n`);

      return 0;
    }

    printDetails(ctx.client, [
      ['ID', skill.id],
      ['Name', skill.name],
      ['Description', skill.description],
      ['Source', sourceLabel(skill)],
      ['Visibility', skill.visibility],
      ['Space', skill.spaceId],
      ['Created', `${formatRelativeTime(skill.createdAt)} (${skill.createdAt})`],
      ['Updated', `${formatRelativeTime(skill.updatedAt)} (${skill.updatedAt})`],
      ['Length', `${String(skill.content.length)} characters`],
    ]);
    ctx.client.output.print(`${chalk.dim('─'.repeat(40))}\n${skill.content.trimEnd()}\n`);

    return 0;
  },
};

const add: Subcommand = {
  command: skillsAddCommand,
  aliases: ['create'],
  needsProject: true,
  flags: { '--name': String, '--description': String, '--visibility': String, '--space': String },
  async run(ctx) {
    const { text, file } = await readMarkdownArgument(ctx.client, ctx.args[0] as string);
    const local = applyFlags(parseSkillMarkdown(text, file), ctx.flags);

    if (!local.name && file === 'stdin') {
      throw new Error('Pass --name when reading the skill from stdin.');
    }

    const input = toSkillInput({ ...local, name: local.name ?? nameFromFilename(file) });
    const errors = validateSkillInput(input);

    if (errors.length > 0) {
      throw new Error(`The skill is not valid: ${errors.join('; ')}.`);
    }

    const skill = requireSkill(await createSkill(ctx, input));

    if (ctx.json) {
      printJson(ctx.client, { skill });

      return 0;
    }

    printSkillLine(ctx, 'Created', skill);

    return 0;
  },
};

const update: Subcommand = {
  command: skillsUpdateCommand,
  needsProject: true,
  flags: {
    '--file': String,
    '-f': '--file',
    '--name': String,
    '--description': String,
    '--visibility': String,
    '--space': String,
  },
  async run(ctx) {
    const changes = ['--file', '--name', '--description', '--visibility', '--space'].filter(
      (flag) => ctx.flags[flag] !== undefined
    );

    if (changes.length === 0) {
      throw new Error('Nothing to change. Pass --file, --name, --description, --visibility or --space.');
    }

    const remote = await resolveSkill(ctx, ctx.args[0] as string);

    if (remote.source !== 'studio') {
      throw new Error(readOnlyHint(remote));
    }

    const fromFile = ctx.flags['--file']
      ? await readMarkdownArgument(ctx.client, ctx.flags['--file'] as string)
      : undefined;
    const parsed = fromFile
      ? parseSkillMarkdown(fromFile.text, fromFile.file)
      : { file: '', content: remote.content.trim() };
    // A file's own name only applies when its front matter sets one, never the file name.
    const local = applyFlags({ ...parsed, name: parsed.name ?? remote.name }, ctx.flags);
    const input = toSkillInput(local, remote);
    const errors = validateSkillInput(input);

    if (errors.length > 0) {
      throw new Error(`The skill is not valid: ${errors.join('; ')}.`);
    }

    const skill = requireSkill(await updateSkill(ctx, remote.id, input));

    if (ctx.json) {
      printJson(ctx.client, { skill });

      return 0;
    }

    printSkillLine(ctx, 'Updated', skill);

    return 0;
  },
};

const rm: Subcommand = {
  command: skillsRemoveCommand,
  aliases: ['remove'],
  needsProject: true,
  async run(ctx) {
    const skill = await resolveSkill(ctx, ctx.args[0] as string);

    if (skill.source !== 'studio') {
      throw new Error(`${readOnlyHint(skill)} Code skills are removed from flexkit.tools.ts.`);
    }

    if (!(await confirmAction(ctx, `Delete the skill "${skill.name}" (${skill.id})?`))) {
      return 1;
    }

    const result = await deleteSkill(ctx, skill.id);

    if (!result.success) {
      throw new Error(String(result.errorMessage) || 'The skill could not be deleted.');
    }

    if (ctx.json) {
      printJson(ctx.client, { deleted: true, id: skill.id });

      return 0;
    }

    printSkillLine(ctx, 'Deleted', skill);

    return 0;
  },
};

const fork: Subcommand = {
  command: skillsForkCommand,
  needsProject: true,
  async run(ctx) {
    const source = await resolveSkill(ctx, ctx.args[0] as string);
    const skill = requireSkill(
      await ctx.client.fetch<SkillMutationResponse>(`/skills/${encodeURIComponent(source.id)}/fork`, {
        method: 'POST',
        projectId: ctx.projectId,
      })
    );

    if (ctx.json) {
      printJson(ctx.client, { skill });

      return 0;
    }

    printSkillLine(ctx, 'Forked', skill);
    ctx.client.output.log(chalk.dim('The copy is personal; change it with `flexkit skills update`.'));

    return 0;
  },
};

interface LocalFile {
  /** File name relative to the folder. */
  name: string;
  path: string;
  text: string;
}

function readSkillFolder(dir: string): LocalFile[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  if (!fs.statSync(dir).isDirectory()) {
    throw new Error(`${dir} is not a folder.`);
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(md|markdown)$/i.test(entry.name) && !entry.name.startsWith('.'))
    .map((entry) => ({ name: entry.name, path: path.join(dir, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((file) => ({ ...file, text: fs.readFileSync(file.path, 'utf8') }));
}

function folderArgument(ctx: SubcommandContext): { dir: string; label: string } {
  const label = ctx.args[0] ?? DEFAULT_DIR;

  return { dir: path.resolve(ctx.client.cwd, label), label };
}

const pull: Subcommand = {
  command: skillsPullCommand,
  needsProject: true,
  flags: { '--dry-run': Boolean },
  async run(ctx) {
    const { dir, label } = folderArgument(ctx);
    const dryRun = Boolean(ctx.flags['--dry-run']);

    ctx.client.output.spinner('Fetching skills');
    const all = await fetchAllSkills(ctx);

    ctx.client.output.stopSpinner();

    const skills = all.filter((skill) => skill.source === 'studio').sort((a, b) => a.name.localeCompare(b.name));
    const existing = new Map<string, string>();
    const existingNames = new Map<string, string>();
    const existingText = new Map<string, string>();

    for (const file of readSkillFolder(dir)) {
      existingText.set(file.name.toLowerCase(), file.text);

      try {
        const { id, name } = parseSkillMarkdown(file.text, file.name);

        if (id) {
          existing.set(id, file.name);
        } else {
          existingNames.set((name ?? nameFromFilename(file.name)).toLowerCase(), file.name);
        }
      } catch {
        // A file with broken front matter is not claimed by any skill, nor overwritten.
        existingNames.set(`\u0000${file.name}`, file.name);
      }
    }

    const filenames = assignPullFilenames(skills, existing, existingNames);
    const results: { id: string; name: string; file: string; status: 'created' | 'updated' | 'unchanged' }[] = [];

    if (!dryRun) {
      fs.mkdirSync(dir, { recursive: true });
    }

    for (const skill of skills) {
      const file = filenames.get(skill.id) as string;
      const text = skillToMarkdown(skill);
      const previous = existingText.get(file.toLowerCase());
      const status = previous === undefined ? 'created' : previous === text ? 'unchanged' : 'updated';

      if (!dryRun && status !== 'unchanged') {
        fs.writeFileSync(path.join(dir, file), text);
      }

      results.push({ id: skill.id, name: skill.name, file: path.join(label, file), status });
    }

    const skipped = all.length - skills.length;

    if (ctx.json) {
      printJson(ctx.client, { dryRun, dir: label, files: results, skippedReadOnly: skipped });

      return 0;
    }

    const changed = results.filter((result) => result.status !== 'unchanged');

    printTable(
      ctx.client,
      ['FILE', 'SKILL', 'CHANGE'],
      changed.map((result) => [
        result.file,
        result.name,
        result.status === 'created' ? chalk.green('new file') : chalk.yellow('overwrite'),
      ]),
      `Everything in ${label} is up to date.`
    );

    const summary = `${String(changed.length)} file${changed.length === 1 ? '' : 's'} ${dryRun ? 'would be written' : 'written'}, ${String(results.length - changed.length)} unchanged.`;

    if (dryRun) {
      ctx.client.output.log(`${summary} ${chalk.dim('(dry run)')}`);
    } else {
      ctx.client.output.success(summary);
    }

    if (skipped > 0) {
      ctx.client.output.log(
        chalk.dim(
          `${String(skipped)} skill${skipped === 1 ? '' : 's'} from code or plugins not pulled; code skills live in flexkit.tools.ts.`
        )
      );
    }

    return 0;
  },
};

function describeAction(action: PushAction, label: (file: string) => string): string[] {
  switch (action.type) {
    case 'create':
      return [label(action.file), action.input.name, chalk.green('create')];
    case 'update':
      return [label(action.file), action.input.name, chalk.yellow('update')];
    case 'unchanged':
      return [label(action.file), action.remote.name, chalk.dim('unchanged')];
    case 'skip':
      return [label(action.file), action.remote?.name ?? '', chalk.dim(`skip: ${action.reason}`)];
    case 'invalid':
      return [label(action.file), '', chalk.red(`invalid: ${action.errors.join('; ')}`)];
    case 'delete':
      return [chalk.dim('(no file)'), action.remote.name, chalk.red('delete')];
  }
}

const push: Subcommand = {
  command: skillsPushCommand,
  needsProject: true,
  flags: { '--dry-run': Boolean, '--prune': Boolean },
  async run(ctx) {
    const { dir, label } = folderArgument(ctx);
    const dryRun = Boolean(ctx.flags['--dry-run']);
    const prune = Boolean(ctx.flags['--prune']);

    if (!fs.existsSync(dir)) {
      throw new Error(`Folder not found: ${label}. Run \`flexkit skills pull ${label}\` first, or pass the folder.`);
    }

    const locals: LocalSkill[] = [];
    const parseErrors: PushAction[] = [];

    for (const file of readSkillFolder(dir)) {
      try {
        locals.push(parseSkillMarkdown(file.text, file.name));
      } catch (err: unknown) {
        parseErrors.push({
          type: 'invalid',
          file: file.name,
          errors: [err instanceof Error ? err.message : String(err)],
        });
      }
    }

    ctx.client.output.spinner('Fetching skills');
    const remotes = await fetchAllSkills(ctx);

    ctx.client.output.stopSpinner();

    const plan = planSkillPush(locals, remotes, { prune: prune && parseErrors.length === 0 });

    if (prune && plan.unmatched.length > 0 && [...parseErrors, ...plan.actions].some((a) => a.type === 'invalid')) {
      ctx.client.output.warn('Nothing is pruned while a file is invalid. Fix the files marked invalid and push again.');
    }
    const actions = [...parseErrors, ...plan.actions];
    const writes = actions.filter((action) => ['create', 'update', 'delete'].includes(action.type));
    const deletes = actions.filter((action) => action.type === 'delete').length;
    const relative = (file: string): string => path.join(label, file);
    const results: { action: PushAction; ok: boolean; error?: string; id?: string }[] = [];

    if (!ctx.json) {
      printTable(
        ctx.client,
        ['FILE', 'SKILL', 'ACTION'],
        actions.map((action) => describeAction(action, relative)),
        `No Markdown files in ${label}.`
      );
    }

    if (!dryRun && writes.length > 0) {
      if (
        deletes > 0 &&
        !(await confirmAction(ctx, `Delete ${String(deletes)} skill${deletes === 1 ? '' : 's'} that no file matches?`))
      ) {
        return 1;
      }

      for (const action of writes) {
        try {
          if (action.type === 'create') {
            const skill = requireSkill(await createSkill(ctx, action.input));

            results.push({ action, ok: true, id: skill.id });
          } else if (action.type === 'update') {
            requireSkill(await updateSkill(ctx, action.remote.id, action.input));
            results.push({ action, ok: true, id: action.remote.id });
          } else if (action.type === 'delete') {
            const result = await deleteSkill(ctx, action.remote.id);

            if (!result.success) {
              throw new Error(String(result.errorMessage));
            }

            results.push({ action, ok: true, id: action.remote.id });
          }
        } catch (err: unknown) {
          results.push({ action, ok: false, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    const failed = results.filter((result) => !result.ok);
    const invalid = actions.filter((action) => action.type === 'invalid').length;

    if (ctx.json) {
      printJson(ctx.client, {
        dryRun,
        dir: label,
        actions: actions.map((action) => {
          const result = results.find((entry) => entry.action === action);

          return {
            type: action.type,
            file: 'file' in action ? relative(action.file) : null,
            name: 'input' in action ? action.input.name : ((action as { remote?: SkillDto }).remote?.name ?? null),
            id: result?.id ?? ('remote' in action ? action.remote?.id : undefined) ?? null,
            ...('reason' in action ? { reason: action.reason } : {}),
            ...('errors' in action ? { errors: action.errors } : {}),
            ...(result ? { ok: result.ok, error: result.error } : {}),
          };
        }),
        unmatched: prune ? [] : plan.unmatched.map((skill) => ({ id: skill.id, name: skill.name })),
      });
    } else {
      for (const result of failed) {
        const name =
          'input' in result.action
            ? result.action.input.name
            : 'remote' in result.action
              ? result.action.remote?.name
              : '';

        ctx.client.output.error(`${name ?? ''}: ${result.error ?? 'failed'}`);
      }

      const count = (type: PushAction['type']): number => actions.filter((action) => action.type === type).length;
      const parts = (verbs: [string, string, string]): string =>
        [
          `${String(count('create'))} ${verbs[0]}`,
          `${String(count('update'))} ${verbs[1]}`,
          ...(prune ? [`${String(deletes)} ${verbs[2]}`] : []),
          `${String(count('unchanged'))} unchanged`,
          ...(count('skip') > 0 ? [`${String(count('skip'))} skipped`] : []),
          ...(invalid > 0 ? [`${String(invalid)} invalid`] : []),
        ].join(', ');

      if (dryRun) {
        ctx.client.output.log(
          `${parts(['to create', 'to update', 'to delete'])} ${chalk.dim('(dry run, nothing changed)')}`
        );
      } else if (writes.length === 0) {
        ctx.client.output.log(`Nothing to push: ${parts(['to create', 'to update', 'to delete'])}.`);
      } else if (failed.length === 0) {
        ctx.client.output.success(`Pushed ${label}: ${parts(['created', 'updated', 'deleted'])}.`);
      }

      if (!prune && plan.unmatched.length > 0) {
        ctx.client.output.log(
          chalk.dim(
            `${String(plan.unmatched.length)} Studio skill${plan.unmatched.length === 1 ? ' has' : 's have'} no file and ${plan.unmatched.length === 1 ? 'was' : 'were'} kept (pass --prune to delete, or pull to add the files).`
          )
        );
      }
    }

    return failed.length > 0 || invalid > 0 ? 1 : 0;
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: skillsCommand,
    subcommands: [ls, inspect, add, update, rm, fork, pull, push],
    defaultSubcommand: 'ls',
  });
}
