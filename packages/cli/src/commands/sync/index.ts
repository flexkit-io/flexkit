import { handleError } from '../../util/handle-error';
import parseArguments from '../../util/parse-args';
import type Client from '../../util/client';
import { getCommandName } from '../../util/pkg';
import { errorToString, isAPIError } from '../../util/error-utils';
import { help } from '../help';
import { syncCommand } from './command';

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
  let exitCode = 0;

  try {
    await Promise.all(
      client.flexkitConfig.projects.map(async (project) => {
        return await client.fetch('/generate-sdl', {
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
  } catch (err: unknown) {
    let handled = false;
    exitCode = 1;

    if (isAPIError(err)) {
      if (err.status === 401) {
        output.log(`You are not logged in. Please log in first by running ${getCommandName(`login`)}`);
        handled = true;
      }

      if (err.status !== 200 && !handled) {
        output.debug(err.message);
        handled = true;
      }

      if (err.status === 400) {
        if (Array.isArray(err.serverMessage)) {
          err.serverMessage.forEach((error: { message: string }) => {
            output.error(error.message);
          });
        } else {
          output.error(err.serverMessage);
        }
        handled = true;
      }
    }

    if (!handled) {
      output.debug(errorToString(err));
    }
  }

  if (exitCode === 0) {
    output.log('The schema has been synced!');
  } else {
    output.error('Failed syncing the schema');
  }

  return exitCode;
}
