import type Client from '../../util/client';
import { isAPIError } from '../../util/error-utils';
import { resolveProject } from '../../util/get-project';
import { handleError } from '../../util/handle-error';
import parseArguments from '../../util/parse-args';
import { getCommandName } from '../../util/pkg';
import { help } from '../help';
import { toolsCommand, toolsSyncCommand } from './command';

interface ToolsSyncResponse {
  ok: boolean;
  tools: string[];
  warnings: string[];
}

async function sync(client: Client, projectId: string, origin: string | undefined): Promise<number> {
  const { output } = client;
  const body: { origin?: string } = {};

  if (origin !== undefined) {
    body.origin = origin;
  }

  try {
    output.spinner(origin ? 'Saving the tools URL and syncing' : 'Syncing the production tool catalog');
    const response = await client.fetch<ToolsSyncResponse>('/tools/sync', {
      body,
      method: 'POST',
      projectId,
      retry: { retries: 0 },
    });
    output.stopSpinner();

    if (response.tools.length === 0) {
      output.success(`[${projectId}] Catalog synced. The tools URL returned no tools.`);
    } else {
      output.success(`[${projectId}] Catalog synced: ${response.tools.join(', ')}`);
    }

    for (const warning of response.warnings) {
      output.warn(`[${projectId}] ${warning}`);
    }

    return 0;
  } catch (err: unknown) {
    output.stopSpinner();

    if (isAPIError(err)) {
      if (err.status === 401) {
        output.log(`[${projectId}] You are not logged in. Please log in first by running ${getCommandName('login')}`);
      } else if (err.status === 403) {
        output.error(`[${projectId}] Only owners and developers can sync custom tools.`);
      } else if (err.status === 409) {
        output.error(
          `[${projectId}] ${err.serverMessage} Pass --origin <url> or set the tools URL and signing secret in the Dashboard.`
        );
      } else {
        output.error(`[${projectId}] ${err.serverMessage}`);
      }

      return 1;
    }

    throw err;
  }
}

export default async function main(client: Client): Promise<number> {
  let argv;
  const { output } = client;

  try {
    argv = parseArguments(client.argv.slice(2), {
      '--help': Boolean,
      '-h': '--help',
      '--origin': String,
      '--project': String,
    });
  } catch (err: unknown) {
    handleError(err);

    return 1;
  }

  const [, subcommand] = argv.args;

  if (argv.flags['--help'] || !subcommand) {
    output.print(help(subcommand === 'sync' ? toolsSyncCommand : toolsCommand, { columns: client.stderr.columns }));

    return 2;
  }

  if (subcommand !== 'sync') {
    output.error(`The ${subcommand} subcommand does not exist. Use ${getCommandName('tools --help')}.`);

    return 1;
  }

  const project = resolveProject(client, argv.flags['--project']);

  if (!project) {
    return 1;
  }

  return sync(client, project.projectId, argv.flags['--origin']);
}
