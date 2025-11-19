import { handleError } from '../../util/handle-error';
import parseArguments from '../../util/parse-args';
import type Client from '../../util/client';
import { getCommandName } from '../../util/pkg';
import { isAPIError, errorToString } from '../../util/error-utils';
import { help } from '../help';
import { whoamiCommand } from './command';

interface WhoAmIResponse {
  display_name?: string | null;
  email?: string | null;
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
    output.print(help(whoamiCommand, { columns: client.stderr.columns }));

    return 2;
  }

  const url = new URL('/api/auth/user', client.authUrl);

  try {
    output.spinner('');
    const res = await client.fetch<WhoAmIResponse>(url.href);
    output.stopSpinner();
    const name = (res.display_name && res.display_name.trim()) || (res.email && res.email.trim()) || '';

    if (name) {
      output.log(name);

      return 0;
    }

    output.error('No user information available.');

    return 1;
  } catch (err: unknown) {
    output.stopSpinner();

    if (isAPIError(err)) {
      if (err.status === 401) {
        output.log(`You are not logged in. Please log in first by running ${getCommandName('login')}`);

        return 1;
      }

      output.debug(err.message);

      return 1;
    }

    output.debug(errorToString(err));

    return 1;
  }
}
