import chalk from 'chalk';
import parseArguments from '../../util/parse-args';
import type Client from '../../util/client';
import { help } from '../help';
import { getCommandName } from '../../util/pkg';
import { reportError } from '../../util/command-group';
import { printJson } from '../../util/output/format';
import humanizePath from '../../util/humanize-path';
import { findProjectLink, removeProjectLink, writeProjectLink, type ProjectLink } from '../../util/project-link';
import { linkCommand, unlinkCommand } from './command';

interface Team {
  id: string;
  name: string;
}

interface ProjectSummary {
  id: string;
  name: string;
}

interface ProjectListResponse {
  team: Team;
  projects: ProjectSummary[];
}

interface ProjectSingleResponse {
  team: Team;
  project: ProjectSummary;
}

function projectsPath(nameOrId: string | undefined, scope: string | undefined): string {
  const query = scope ? `?${new URLSearchParams({ scope }).toString()}` : '';

  return `/api/projects${nameOrId ? `/${encodeURIComponent(nameOrId)}` : ''}${query}`;
}

async function chooseProject(client: Client, scope: string | undefined): Promise<ProjectSingleResponse | null> {
  const response = await client.fetch<ProjectListResponse>(projectsPath(undefined, scope));

  if (response.projects.length === 0) {
    client.output.error(
      `Team "${response.team.name}" has no projects yet. Create one with ${getCommandName('project add <name>')}.`
    );

    return null;
  }

  if (!client.stdin.isTTY) {
    client.output.error('Pass the project name or id when running without a terminal: flexkit link <nameOrId>');

    return null;
  }

  const projectId = await client.input.select<string>({
    message: `Which project of ${response.team.name} should this folder use?`,
    choices: response.projects.map((project) => ({
      name: `${project.name} ${chalk.dim(project.id)}`,
      value: project.id,
    })),
  });
  const project = response.projects.find((entry) => entry.id === projectId);

  return project ? { team: response.team, project } : null;
}

export async function link(client: Client): Promise<number> {
  const { output } = client;
  let argv;

  try {
    argv = parseArguments(client.argv.slice(2), {
      '--help': Boolean,
      '-h': '--help',
      '--yes': Boolean,
      '-y': '--yes',
      '--json': Boolean,
    });
  } catch (err: unknown) {
    output.error(err instanceof Error ? err.message : String(err));

    return 1;
  }

  if (argv.flags['--help']) {
    output.print(help(linkCommand, { columns: client.stderr.columns }));

    return 2;
  }

  const [, nameOrId] = argv.args;
  const scope = argv.flags['--scope'];

  try {
    const existing = findProjectLink(client.cwd);

    if (existing && !argv.flags['--yes']) {
      const label = existing.link.projectName ?? existing.link.projectId;

      if (!client.stdin.isTTY) {
        output.error(`This folder is already linked to "${label}". Pass --yes to replace the link.`);

        return 1;
      }

      const replace = await client.input.confirm({
        message: `This folder is linked to "${label}" (${humanizePath(existing.file)}). Replace the link?`,
        default: false,
      });

      if (!replace) {
        output.log('Canceled.');

        return 0;
      }
    }

    const selected = nameOrId
      ? await client.fetch<ProjectSingleResponse>(projectsPath(nameOrId, scope))
      : await chooseProject(client, scope);

    if (!selected) {
      return 1;
    }

    const projectLink: ProjectLink = {
      projectId: selected.project.id,
      projectName: selected.project.name,
      teamId: selected.team.id,
      teamName: selected.team.name,
    };
    const { file, gitignoreUpdated } = writeProjectLink(client.cwd, projectLink);

    if (argv.flags['--json']) {
      printJson(client, { ...projectLink, file });

      return 0;
    }

    output.success(
      `Linked to ${chalk.bold(selected.project.name)} (${selected.project.id}) in team ${selected.team.name}.`
    );
    output.log(`Saved ${humanizePath(file)}${gitignoreUpdated ? ' and added .flexkit to .gitignore' : ''}.`);

    return 0;
  } catch (err: unknown) {
    output.stopSpinner();

    return reportError(client, err);
  }
}

export async function unlink(client: Client): Promise<number> {
  const { output } = client;
  let argv;

  try {
    argv = parseArguments(client.argv.slice(2), {
      '--help': Boolean,
      '-h': '--help',
      '--yes': Boolean,
      '-y': '--yes',
    });
  } catch (err: unknown) {
    output.error(err instanceof Error ? err.message : String(err));

    return 1;
  }

  if (argv.flags['--help']) {
    output.print(help(unlinkCommand, { columns: client.stderr.columns }));

    return 2;
  }

  const existing = findProjectLink(client.cwd);

  if (!existing) {
    output.log('This folder is not linked to a Flexkit project.');

    return 0;
  }

  const label = existing.link.projectName ?? existing.link.projectId;

  if (!argv.flags['--yes']) {
    if (!client.stdin.isTTY) {
      output.error(`Pass --yes to remove the link to "${label}" when running without a terminal.`);

      return 1;
    }

    const confirmed = await client.input.confirm({
      message: `Remove the link to "${label}" (${humanizePath(existing.file)})?`,
      default: true,
    });

    if (!confirmed) {
      output.log('Canceled.');

      return 0;
    }
  }

  removeProjectLink(existing);
  output.success(`Unlinked from ${label}.`);

  return 0;
}
