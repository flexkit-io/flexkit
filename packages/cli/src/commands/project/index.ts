import parseArguments from '../../util/parse-args';
import type Client from '../../util/client';
import table from '../../util/output/table';
import { handleError } from '../../util/handle-error';
import { getCommandName } from '../../util/pkg';
import { isAPIError, isObject } from '../../util/error-utils';
import { help } from '../help';
import { projectAddCommand, projectCommand, projectListCommand, projectRemoveCommand } from './command';

interface Team {
  id: string;
  name: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  createdAt?: string;
}

interface ProjectListResponse {
  team: Team;
  projects: ProjectSummary[];
}

interface ProjectSingleResponse {
  team: Team;
  project: ProjectSummary;
}

interface ProjectDeleteResponse {
  deleted: boolean;
  project: {
    id: string;
    name: string;
  };
}

interface ProjectAddResponse {
  team: Team;
  project: ProjectSummary;
}

interface ProjectAmbiguousMatch {
  id: string;
  name: string;
  createdAt?: string;
}

type ProjectLsResponse = ProjectListResponse | ProjectSingleResponse;

function buildProjectsPath(nameOrId: string | undefined, scope: string | undefined): string {
  let path = '/api/projects';

  if (nameOrId) {
    path += `/${encodeURIComponent(nameOrId)}`;
  }

  if (scope) {
    const query = new URLSearchParams({ scope });
    path += `?${query.toString()}`;
  }

  return path;
}

function isProjectSingleResponse(response: ProjectLsResponse): response is ProjectSingleResponse {
  return 'project' in response;
}

function renderProjectList(output: Client['output'], response: ProjectListResponse): void {
  output.log(`Team: ${response.team.name} (${response.team.id})`);

  if (response.projects.length === 0) {
    output.log('No projects found.');

    return;
  }

  const rows = [
    ['ID', 'Name', 'Created At'],
    ...response.projects.map((project) => [project.id, project.name, project.createdAt ?? '']),
  ];

  output.print(table(rows));
}

function renderSingleProject(output: Client['output'], response: ProjectSingleResponse): void {
  output.log(`Team: ${response.team.name} (${response.team.id})`);
  output.print(
    table([
      ['ID', response.project.id],
      ['Name', response.project.name],
      ['Created At', response.project.createdAt ?? ''],
    ])
  );
}

function renderJson(output: Client['output'], payload: unknown): void {
  output.print(JSON.stringify(payload, null, 2));
}

function getApiErrorMessage(err: Error): string {
  if (!isAPIError(err)) {
    return err.message;
  }

  if (isObject(err) && typeof err.error === 'string') {
    return err.error;
  }

  if (typeof err.serverMessage === 'string' && err.serverMessage !== 'Response Error') {
    return err.serverMessage;
  }

  return err.message;
}

function getAmbiguousMatches(err: Error): ProjectAmbiguousMatch[] {
  if (!isAPIError(err)) {
    return [];
  }

  if (!isObject(err) || !Array.isArray(err.matches)) {
    return [];
  }

  const matches: ProjectAmbiguousMatch[] = [];

  for (const entry of err.matches) {
    if (!isObject(entry)) {
      continue;
    }

    if (typeof entry.id !== 'string' || typeof entry.name !== 'string') {
      continue;
    }

    const match: ProjectAmbiguousMatch = {
      id: entry.id,
      name: entry.name,
    };

    if (typeof entry.createdAt === 'string') {
      match.createdAt = entry.createdAt;
    }

    matches.push(match);
  }

  return matches;
}

function renderAmbiguousMatches(output: Client['output'], matches: ProjectAmbiguousMatch[]): void {
  if (matches.length === 0) {
    output.error('Project name is ambiguous. Retry with the project id.');

    return;
  }

  output.error('Project name is ambiguous. Use one of the following project ids:');

  const rows = [['ID', 'Name', 'Created At'], ...matches.map((match) => [match.id, match.name, match.createdAt ?? ''])];

  output.print(table(rows));
}

function handleProjectError(client: Client, err: unknown, command: 'ls' | 'add' | 'rm'): number {
  const { output } = client;

  if (!isAPIError(err)) {
    output.debug(String(err));

    return 1;
  }

  if (err.status === 401) {
    output.log(`You are not logged in. Please log in first by running ${getCommandName('login')}`);

    return 1;
  }

  if (err.status === 409 && (command === 'ls' || command === 'rm')) {
    renderAmbiguousMatches(output, getAmbiguousMatches(err));

    return 1;
  }

  output.error(getApiErrorMessage(err));

  return 1;
}

async function runList(
  client: Client,
  nameOrId: string | undefined,
  scope: string | undefined,
  jsonOutput: boolean
): Promise<number> {
  const response = await client.fetch<ProjectLsResponse>(buildProjectsPath(nameOrId, scope));

  if (jsonOutput) {
    renderJson(client.output, response);

    return 0;
  }

  if (isProjectSingleResponse(response)) {
    renderSingleProject(client.output, response);

    return 0;
  }

  renderProjectList(client.output, response);

  return 0;
}

async function runAdd(client: Client, name: string, scope: string | undefined, jsonOutput: boolean): Promise<number> {
  const body: { name: string; scope?: string } = { name };

  if (scope) {
    body.scope = scope;
  }

  const response = await client.fetch<ProjectAddResponse>('/api/projects', {
    method: 'POST',
    body,
  });

  if (jsonOutput) {
    renderJson(client.output, response);

    return 0;
  }

  client.output.log(
    `Created project "${response.project.name}" (${response.project.id}) in team "${response.team.name}" (${response.team.id}).`
  );

  return 0;
}

async function runRemove(
  client: Client,
  nameOrId: string,
  scope: string | undefined,
  jsonOutput: boolean
): Promise<number> {
  const path = buildProjectsPath(nameOrId, scope);
  const lookup = await client.fetch<ProjectSingleResponse>(path);
  const confirmed = await client.input.confirm({
    message: `Delete project "${lookup.project.name}" (${lookup.project.id}) from team "${lookup.team.name}"?`,
    default: false,
  });

  if (!confirmed) {
    client.output.log('Canceled.');

    return 0;
  }

  const response = await client.fetch<ProjectDeleteResponse>(path, {
    method: 'DELETE',
  });

  if (jsonOutput) {
    renderJson(client.output, response);

    return 0;
  }

  client.output.log(`Deleted project "${response.project.name}" (${response.project.id}).`);

  return 0;
}

function printHelp(client: Client, subcommand: string | undefined): number {
  const { columns } = client.stderr;

  if (!subcommand) {
    client.output.print(help(projectCommand, { columns }));

    return 2;
  }

  if (subcommand === 'ls') {
    client.output.print(help(projectListCommand, { columns }));

    return 2;
  }

  if (subcommand === 'add') {
    client.output.print(help(projectAddCommand, { columns }));

    return 2;
  }

  if (subcommand === 'rm') {
    client.output.print(help(projectRemoveCommand, { columns }));

    return 2;
  }

  client.output.error(`The ${subcommand} subcommand does not exist`);

  return 1;
}

export default async function main(client: Client): Promise<number> {
  let argv;

  try {
    argv = parseArguments(client.argv.slice(2), {
      '--help': Boolean,
      '-h': '--help',
      '--json': Boolean,
    });
  } catch (err: unknown) {
    handleError(err);

    return 1;
  }

  const [, subcommand, input] = argv.args;
  const scope = argv.flags['--scope'];
  const jsonOutput = argv.flags['--json'] ?? false;

  if (argv.flags['--help']) {
    return printHelp(client, subcommand);
  }

  if (!subcommand) {
    client.output.error(
      `No subcommand provided. Use ${getCommandName('project --help')} to see available project subcommands.`
    );

    return 1;
  }

  try {
    if (subcommand === 'ls') {
      return await runList(client, input, scope, jsonOutput);
    }

    if (subcommand === 'add') {
      if (!input) {
        client.output.error(`Missing required project name. Usage: ${getCommandName('project add <name>')}`);

        return 1;
      }

      return await runAdd(client, input, scope, jsonOutput);
    }

    if (subcommand === 'rm') {
      if (!input) {
        client.output.error(`Missing required project id or name. Usage: ${getCommandName('project rm <nameOrId>')}`);

        return 1;
      }

      return await runRemove(client, input, scope, jsonOutput);
    }

    client.output.error(`The ${subcommand} subcommand does not exist`);

    return 1;
  } catch (err: unknown) {
    if (subcommand === 'ls' || subcommand === 'add' || subcommand === 'rm') {
      return handleProjectError(client, err, subcommand);
    }

    client.output.debug(String(err));

    return 1;
  }
}
