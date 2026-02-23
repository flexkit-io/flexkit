#!/usr/bin/env node

import { isErrnoException, isError, errorToString } from './util/error-utils';

try {
  // Test to see if cwd has been deleted before importing 3rd party packages that might need cwd.
  process.cwd();
} catch (err: unknown) {
  if (isError(err) && err.message.includes('uv_cwd')) {
    console.error('Error: The current working directory does not exist.');
    process.exit(1);
  }
}

/* eslint import/first: 0 -- the cwd check need to be before these imports */
import { mkdirp } from 'fs-extra';
import { ProxyAgent } from 'proxy-agent';
import getGlobalPathConfig from './util/config/global-path';
import { defaultAuthConfig, defaultGlobalConfig } from './util/config/default';
import parseArguments from './util/parse-args';
import { errorOutput, highlightOutput, paramOutput, Output } from './util/output';
import hp from './util/humanize-path';
import { getPackageJSON, getCommandName } from './util/pkg';
import { help } from './args';
import * as configFiles from './util/config/files';
import type { AuthConfig, FlexkitConfig, GlobalConfig } from './types';
import { APIError, CantFindConfig, InvalidProjectConfig } from './util/error-types';
import Client from './util/client';
import getConfig from './util/get-config';
import loginCommand from './commands/login';
import logoutCommand from './commands/logout';
import deployCommand from './commands/deploy';
import projectCommand from './commands/project';
import whoamiCommand from './commands/whoami';
import doLoginPrompt from './util/login/prompt';

const FLEXKIT_DIR = getGlobalPathConfig();
const FLEXKIT_CONFIG_PATH = configFiles.getConfigFilePath();
const FLEXKIT_AUTH_CONFIG_PATH = configFiles.getAuthConfigFilePath();
const API_URL = 'https://api.flexkit.io';
const AUTH_URL = 'https://flexkit.io';
let { isTTY } = process.stdout;
let client: Client;
let output: Output;
let debug: (s: string) => void = () => {
  /**/
};

const main = async (): Promise<number | undefined> => {
  if (process.env.FORCE_TTY === '1') {
    isTTY = true;
    process.stdout.isTTY = true;
    process.stdin.isTTY = true;
  }

  let argv;

  try {
    argv = parseArguments(process.argv, {}, { permissive: true });
  } catch (err: unknown) {
    let error = err;
    if (typeof err === 'string') {
      error = new Error(err);
    }

    const parseError = error as Error;
    errorOutput(parseError.message);

    return 1;
  }

  const isDebugging = argv.flags['--debug'];
  const isNoColor = argv.flags['--no-color'];

  output = new Output(process.stderr, {
    debug: isDebugging,
    noColor: isNoColor,
  });

  // eslint-disable-next-line prefer-destructuring -- debug is previously defined
  debug = output.debug;

  // If a localConfigPath is passed, try to load the configuration from that path, otherwise try to load it from the current path
  const localConfigPath = argv.flags['--local-config'];
  let flexkitConfig: FlexkitConfig | InvalidProjectConfig | Error | undefined = await getConfig(
    output,
    localConfigPath
  );

  if (flexkitConfig instanceof InvalidProjectConfig) {
    output.error(
      `Couldn't parse config file ${flexkitConfig.meta.file}. Please check the file for syntax errors.\n\nError: ${flexkitConfig.meta.error}`
    );

    return 1;
  }

  if (flexkitConfig instanceof CantFindConfig) {
    if (localConfigPath) {
      output.error(`Couldn't find a project configuration file at \n    ${flexkitConfig.meta.paths.join(' or\n    ')}`);

      return 1;
    }

    flexkitConfig = undefined;
  }

  if (flexkitConfig instanceof Error) {
    output.prettyError(flexkitConfig);

    return 1;
  }

  // Ensure that the Flexkit global configuration directory exists
  try {
    await mkdirp(FLEXKIT_DIR);
  } catch (err: unknown) {
    output.error(
      `An unexpected error occurred while trying to create the global directory "${hp(FLEXKIT_DIR)}" ${errorToString(
        err
      )}`
    );

    return 1;
  }

  let config: GlobalConfig;

  try {
    config = configFiles.readConfigFile();
  } catch (err: unknown) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      config = defaultGlobalConfig;
      try {
        configFiles.writeToConfigFile(config);
      } catch (error: unknown) {
        output.error(
          `An unexpected error occurred while trying to save the config to "${hp(FLEXKIT_CONFIG_PATH)}" ${errorToString(
            error
          )}`
        );
        return 1;
      }
    } else {
      output.error(
        `An unexpected error occurred while trying to read the config in "${hp(FLEXKIT_CONFIG_PATH)}" ${errorToString(
          err
        )}`
      );
      return 1;
    }
  }

  let authConfig: AuthConfig;
  try {
    authConfig = configFiles.readAuthConfigFile();
  } catch (err: unknown) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      authConfig = defaultAuthConfig;
      try {
        configFiles.writeToAuthConfigFile(authConfig);
      } catch (error: unknown) {
        output.error(
          `An unexpected error occurred while trying to write the auth config to "${hp(
            FLEXKIT_AUTH_CONFIG_PATH
          )}" ${errorToString(error)}`
        );
        return 1;
      }
    } else {
      output.error(
        `An unexpected error occurred while trying to read the auth config in "${hp(
          FLEXKIT_AUTH_CONFIG_PATH
        )}" ${errorToString(err)}`
      );
      return 1;
    }
  }

  // Shared API `Client` instance for all sub-commands to utilize
  client = new Client({
    agent: new ProxyAgent({ keepAlive: true }),
    apiUrl: API_URL,
    authUrl: AUTH_URL,
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: output.stream,
    output,
    config,
    authConfig,
    flexkitConfig,
    localConfigPath,
    argv: process.argv,
  });

  // The `--cwd` flag is respected for all sub-commands
  if (argv.flags['--cwd']) {
    client.cwd = argv.flags['--cwd'];
  }

  // The second argument to the command can be:
  //
  //  * a path to deploy (as in: `vercel path/`)
  //  * a subcommand (as in: `vercel ls`)
  // eslint-disable-next-line prefer-destructuring -- this way is easier to read
  let subcommand = argv.args[2];
  // eslint-disable-next-line prefer-destructuring -- this way is easier to read
  const subSubCommand = argv.args[3];

  // Handle `--version` directly
  if (argv.flags['--version']) {
    // eslint-disable-next-line no-console -- Log to stdout
    console.log(getPackageJSON().version);

    return 0;
  }

  // Handle bare `-h` directly
  const bareHelpOption = !subcommand && argv.flags['--help'];
  const bareHelpSubcommand = subcommand === 'help' && !subSubCommand;

  if (bareHelpOption ?? bareHelpSubcommand) {
    output.print(help());

    return 2;
  }

  if (subcommand === 'help') {
    subcommand = subSubCommand;
    client.argv.push('-h');
  }

  const subcommandsWithoutToken = ['login', 'logout', 'help', 'init', 'whoami'];

  // Prompt for login if there is no current token
  if (
    !authConfig.token &&
    !client.argv.includes('-h') &&
    !client.argv.includes('--help') &&
    !argv.flags['--token'] &&
    subcommand &&
    !subcommandsWithoutToken.includes(subcommand)
  ) {
    if (isTTY) {
      output.log(`No existing credentials found. Please log in:`);
      const result = await doLoginPrompt(client);

      // The login function failed, so it returned an exit code
      if (typeof result === 'number') {
        return result;
      }

      // When `result` is a string it's the user's authentication token.
      // It needs to be saved to the configuration file.
      client.authConfig.token = result.sid;

      configFiles.writeToAuthConfigFile(client.authConfig);
      configFiles.writeToConfigFile(client.config);

      output.debug(`Saved credentials in "${hp(FLEXKIT_DIR)}"`);
    } else {
      output.prettyError({
        message: `No existing credentials found. Please run ${getCommandName('login')} or pass ${paramOutput('--token')}`,
        link: 'https://flexkit.io/notifications/no-credentials-found', // TODO: Update link
      });

      return 1;
    }
  }

  if (typeof argv.flags['--token'] === 'string') {
    const token: string = argv.flags['--token'];

    if (token.length === 0) {
      output.prettyError({
        message: `You defined ${paramOutput('--token')}, but it's missing a value`,
        link: 'https://err.sh/vercel/missing-token-value',
      });

      return 1;
    }

    const isValidToken = /^flk-[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/i.test(token);

    if (!isValidToken) {
      output.prettyError({
        message: `You defined ${paramOutput(
          '--token'
        )}, but its value is invalid. Expected format: flk-<32 hex characters (0-9, a-f)>`,
        link: 'https://err.sh/vercel/invalid-token-value',
      });

      return 1;
    }

    client.authConfig.token = token;
    client.authConfig.skipWrite = true;
  }

  let exitCode;

  try {
    if (subcommand) {
      let func: ((client: Client) => Promise<number>) | null;

      switch (subcommand) {
        case 'deploy':
          func = deployCommand;
          break;
        case 'login':
          func = loginCommand;
          break;
        case 'logout':
          func = logoutCommand;
          break;
        case 'project':
          func = projectCommand;
          break;
        case 'whoami':
          func = whoamiCommand;
          break;
        default:
          func = null;
          break;
      }

      if (!func) {
        const sub = paramOutput(subcommand);
        output.error(`The ${sub} subcommand does not exist`);

        return 1;
      }

      exitCode = await func(client);
    }
  } catch (err: unknown) {
    if (isErrnoException(err) && err.code === 'ENOTFOUND') {
      // Error message will look like the following:
      // "request to https://api.vercel.com/v2/user failed, reason: getaddrinfo ENOTFOUND api.vercel.com"
      const matches = /getaddrinfo ENOTFOUND (.*)$/.exec(err.message || '');

      if (matches?.[1]) {
        const [, hostname] = matches;

        output.error(
          `The hostname ${highlightOutput(
            hostname
          )} could not be resolved. Please verify your internet connectivity and DNS configuration.`
        );
      }

      if (typeof err.stack === 'string') {
        output.debug(err.stack);
      }

      return 1;
    }

    if (isErrnoException(err) && err.code === 'ECONNRESET') {
      // Error message will look like the following:
      // request to https://api.vercel.com/v2/user failed, reason: socket hang up
      const matches = /request to https:\/\/(.*?)\//.exec(err.message || '');
      const hostname = matches?.[1];
      if (hostname) {
        output.error(
          `Connection to ${highlightOutput(
            hostname
          )} interrupted. Please verify your internet connectivity and DNS configuration.`
        );
      }
      return 1;
    }

    if (isErrnoException(err) && (err.code === 'NOT_AUTHORIZED' || err.code === 'TEAM_DELETED')) {
      output.prettyError(err);
      return 1;
    }

    if (err instanceof APIError && err.status >= 400 && err.status <= 499) {
      err.message = err.serverMessage;
      output.prettyError(err);

      return 1;
    }

    // If there is a code we should not consider the error unexpected but instead show the message. Any error that is handled
    // by this should actually be handled in the sub command instead.
    if (isErrnoException(err)) {
      if (typeof err.stack === 'string') {
        output.debug(err.stack);
      }
      output.prettyError(err);
    } else {
      // Otherwise it is an unexpected error and we should show the trace and an unexpected error message
      output.error(`An unexpected error occurred in ${subcommand}: ${err as string}`);
    }

    return 1;
  }

  return exitCode;
};

const handleRejection = (err: unknown): void => {
  debug('handling rejection');

  if (err) {
    if (err instanceof Error) {
      handleUnexpected(err);
    } else {
      console.error(errorOutput(`An unexpected rejection occurred\n  ${err as string}`));
    }
  } else {
    console.error(errorOutput('An unexpected empty rejection occurred'));
  }

  process.exit(1);
};

const handleUnexpected = (err: Error): void => {
  console.error(errorOutput(`An unexpected error occurred!\n${err.stack ?? ''}`));

  process.exit(1);
};

process.on('unhandledRejection', (reason) => {
  handleRejection(reason);
});
process.on('uncaughtException', handleUnexpected);

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((err: unknown) => {
    handleUnexpected(err as Error);
  });
