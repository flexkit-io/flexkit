import * as EmailValidator from 'email-validator';
import { help } from '../help';
import type Client from '../../util/client';
import parseArguments from '../../util/parse-args';
import type { LoginResult } from '../../util/login/types';
import prompt from '../../util/login/prompt';
import doGithubLogin from '../../util/login/github';
import doGoogleLogin from '../../util/login/google';
import doBitbucketLogin from '../../util/login/bitbucket';
import { writeToAuthConfigFile } from '../../util/config/files';
import { prependEmoji, emoji } from '../../util/emoji';
import getGlobalPathConfig from '../../util/config/global-path';
import hp from '../../util/humanize-path';
import { getCommandName } from '../../util/pkg';
import { loginCommand } from './command';

export default async function login(client: Client): Promise<number> {
  const { output } = client;
  const argv = parseArguments(client.argv.slice(2), {
    '--oob': Boolean,
    '--github': Boolean,
    '--google': Boolean,
    '--bitbucket': Boolean,
    '--help': Boolean,
    '-h': '--help',
  });

  if (argv.flags['--help']) {
    output.print(help(loginCommand, { columns: client.stderr.columns }));

    return 2;
  }

  const [, input] = argv.args;
  let result: LoginResult = 1;

  if (input) {
    // Email or Team slug was provided via command line
    if (EmailValidator.validate(input)) {
      // result = await doEmailLogin(client, input);
    }
  } else if (argv.flags['--github']) {
    result = await doGithubLogin(client, argv.flags['--oob']);
  } else if (argv.flags['--google']) {
    result = await doGoogleLogin(client, argv.flags['--oob']);
  } else if (argv.flags['--bitbucket']) {
    result = await doBitbucketLogin(client, argv.flags['--oob']);
  } else {
    // Interactive mode
    result = await prompt(client, argv.flags['--oob']);
  }

  // The login function failed, so it returned an exit code
  if (typeof result === 'number') {
    return result;
  }

  client.authConfig.token = result.sid;

  writeToAuthConfigFile(client.authConfig);

  output.debug(`Saved credentials in "${hp(getGlobalPathConfig())}"`);
  output.congratulations(`You are now logged in.`);
  output.print(
    `${prependEmoji(
      `Check out the CLI docs at https://flexkit.io/docs/cli or run ${getCommandName(
        `--help`
      )} for a list of available commands.`,
      emoji('tip')
    )}\n`
  );

  return 0;
}
