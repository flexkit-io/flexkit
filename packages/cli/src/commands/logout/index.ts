import { handleError } from '../../util/handle-error';
import { writeToAuthConfigFile } from '../../util/config/files';
import parseArguments from '../../util/parse-args';
import type Client from '../../util/client';
import { getCommandName } from '../../util/pkg';
import { errorToString, isAPIError } from '../../util/error-utils';
import { help } from '../help';
import { logoutCommand } from './command';

export default async function main(client: Client): Promise<number> {
  let argv;
  const { authConfig, output } = client;
  const url = new URL('/api/auth/logout', client.authUrl);

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
    output.print(help(logoutCommand, { columns: client.stderr.columns }));

    return 2;
  }

  if (!authConfig.token) {
    output.note(`Not currently logged in, so ${getCommandName('logout')} did nothing`);
    return 0;
  }

  output.spinner('Logging out…', 200);
  let exitCode = 0;

  try {
    await client.fetch(url.href, {
      method: 'POST',
    });
  } catch (err: unknown) {
    if (isAPIError(err)) {
      if (err.status === 403) {
        output.debug('Token is invalid so it cannot be revoked');
      } else if (err.status !== 200) {
        output.debug(err.message);
        exitCode = 1;
      }
    }
  }

  delete authConfig.token;

  try {
    writeToAuthConfigFile(authConfig);
    output.debug('Configuration has been deleted');
  } catch (err: unknown) {
    output.debug(errorToString(err));
    exitCode = 1;
  }

  if (exitCode === 0) {
    output.log('Logged out!');
  } else {
    output.error(`Failed during logout`);
  }

  return exitCode;
}
