import { handleError } from '../../util/handle-error';
import parseArguments from '../../util/parse-args';
import type Client from '../../util/client';
import { getCommandName } from '../../util/pkg';
import { errorToString, isAPIError } from '../../util/error-utils';
import { help } from '../help';
import { syncCommand } from './command';

function logProjectSyncError(output: Client['output'], projectId: string, err: unknown): void {
  let handled = false;

  if (!isAPIError(err)) {
    output.debug(`[${projectId}] ${errorToString(err)}`);

    return;
  }

  if (err.status === 401) {
    output.log(`[${projectId}] You are not logged in. Please log in first by running ${getCommandName(`login`)}`);
    handled = true;
  }

  if (err.status !== 200 && !handled) {
    output.debug(`[${projectId}] ${err.message}`);
    handled = true;
  }

  if (err.status === 400) {
    if (Array.isArray(err.serverMessage)) {
      err.serverMessage.forEach((error: unknown) => {
        if (typeof error === 'object' && error !== null && 'message' in error) {
          output.error(`[${projectId}] ${String((error as { message: unknown }).message)}`);

          return;
        }

        output.error(`[${projectId}] ${String(error)}`);
      });
    } else {
      output.error(`[${projectId}] ${String(err.serverMessage)}`);
    }

    handled = true;
  }

  if (!handled) {
    output.debug(`[${projectId}] ${errorToString(err)}`);
  }
}

export default async function main(client: Client): Promise<number> {
  let argv;
  const { output } = client;

  try {
    argv = parseArguments(client.argv.slice(2), {
      '--help': Boolean,
      '-h': '--help',
    });
  } catch (err) {
    handleError(err);

    return 1;
  }

  if (argv.flags['--help']) {
    output.print(help(syncCommand, { columns: client.stderr.columns }));

    return 2;
  }

  if (client.flexkitConfig === undefined) {
    output.error(
      `No Flexkit configuration file found in the current directory. ` +
        `Please ensure you are executing the command from the correct folder, or ` +
        `run ${getCommandName(`init`)} to create a new Flexkit project in this directory.`
    );

    return 1;
  }

  output.spinner('Syncing the schema', 200);
  const { projects } = client.flexkitConfig;

  const results = await Promise.allSettled(
    projects.map(async (project) => {
      await client.fetch('/generate-sdl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema: project.schema ?? [],
          scopes: project.scopes ?? [],
        }),
        projectId: project.projectId,
      });
    })
  );

  const succeededProjectIds: string[] = [];
  const failedProjectIds: string[] = [];

  for (const [idx, result] of results.entries()) {
    const projectId = projects[idx]?.projectId ?? 'unknown';

    if (result.status === 'fulfilled') {
      succeededProjectIds.push(projectId);

      continue;
    }

    failedProjectIds.push(projectId);
    logProjectSyncError(output, projectId, result.reason);
  }

  if (succeededProjectIds.length > 0) {
    const projectsLabel = succeededProjectIds.length === 1 ? succeededProjectIds[0]! : succeededProjectIds.join(', ');
    const projectWord = succeededProjectIds.length === 1 ? 'project' : 'projects';

    output.log(`The schema has been synced for ${projectWord} ${projectsLabel}!`);
  }

  if (failedProjectIds.length > 0) {
    const projectsLabel = failedProjectIds.length === 1 ? failedProjectIds[0]! : failedProjectIds.join(', ');
    const projectWord = failedProjectIds.length === 1 ? 'project' : 'projects';

    output.error(`Failed syncing the schema for ${projectWord} ${projectsLabel}`);

    return 1;
  }

  return 0;
}
