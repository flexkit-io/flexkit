#!/usr/bin/env node
import { isErrnoException, isError, errorToString } from './util/error-utils';

try {
  // Test to see if cwd has been deleted before importing 3rd party packages that might need cwd.
  process.cwd();
} catch (err: unknown) {
  if (isError(err) && err.message.includes('uv_cwd')) {
    // eslint-disable-next-line no-console
    console.error('Error: The current working directory does not exist.');
    process.exit(1);
  }
}

import { mkdirp } from 'fs-extra';
import { ProxyAgent } from 'proxy-agent';
import getGlobalPathConfig from './util/config/global-path';
import { defaultAuthConfig, defaultGlobalConfig } from './util/config/default';
import parseArguments from './util/parse-args';
import { APIError } from './util/error-types';
import { errorOutput, highlightOutput, paramOutput, Output } from './util/output';
import hp from './util/humanize-path';
import pkg from './util/pkg';
import { help } from './args';
import * as configFiles from './util/config/files';
import type { AuthConfig, FlexkitConfig, GlobalConfig } from './types';
import { CantFindConfig, CantParseJSONFile } from './util/error-types';
import Client from './util/client';
import getConfig from './util/get-config';

const FLEXKIT_DIR = getGlobalPathConfig();
const FLEXKIT_CONFIG_PATH = configFiles.getConfigFilePath();
const FLEXKIT_AUTH_CONFIG_PATH = configFiles.getAuthConfigFilePath();
const API_URL = 'https://api.flexkit.io';
let { isTTY } = process.stdout;
let client: Client;
let output: Output;
let debug: (s: string) => void = () => {};

const main = async () => {
  let argv;

  try {
    argv = parseArguments(process.argv, {}, { permissive: true });
  } catch (err: unknown) {
    if (typeof err === 'string') {
      err = new Error(err);
    }

    const error = err as Error;
    errorOutput(error.message);

    return 1;
  }

  const isDebugging = argv.flags['--debug'];
  const isNoColor = argv.flags['--no-color'];

  output = new Output(process.stderr, {
    debug: isDebugging,
    noColor: isNoColor,
  });

  debug = output.debug;

  const localConfigPath = argv.flags['--local-config'];
  let localConfig: FlexkitConfig | Error | undefined = await getConfig(output, localConfigPath);

  if (localConfig instanceof CantParseJSONFile) {
    output.error(`Couldn't parse JSON file ${localConfig.meta.file}.`);

    return 1;
  }

  if (localConfig instanceof CantFindConfig) {
    if (localConfigPath) {
      output.error(`Couldn't find a project configuration file at \n    ${localConfig.meta.paths.join(' or\n    ')}`);

      return 1;
    } else {
      localConfig = undefined;
    }
  }

  if (localConfig instanceof Error) {
    output.prettyError(localConfig);
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
      } catch (err: unknown) {
        output.error(
          `An unexpected error occurred while trying to save the config to "${hp(FLEXKIT_CONFIG_PATH)}" ${errorToString(
            err
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
      } catch (err: unknown) {
        output.error(
          `An unexpected error occurred while trying to write the auth config to "${hp(
            FLEXKIT_AUTH_CONFIG_PATH
          )}" ${errorToString(err)}`
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
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: output.stream,
    output,
    config,
    authConfig,
    localConfig,
    localConfigPath,
    argv: process.argv,
  });

  // The second argument to the command can be:
  //
  //  * a path to deploy (as in: `vercel path/`)
  //  * a subcommand (as in: `vercel ls`)
  const subcommand = argv.args[2];
  const subSubCommand = argv.args[3];

  // Handle `--version` directly
  if (argv.flags['--version']) {
    // eslint-disable-next-line no-console
    console.log(pkg.version);

    return 0;
  }

  // Handle bare `-h` directly
  const bareHelpOption = !subcommand && argv.flags['--help'];
  const bareHelpSubcommand = subcommand === 'help' && !subSubCommand;

  if (bareHelpOption || bareHelpSubcommand) {
    output.print(help());

    return 2;
  }

  let exitCode;

  try {
    if (subcommand) {
      let func: any;

      switch (subcommand) {
        case 'login':
          func = require('./commands/login').default;
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

      if (func.default) {
        func = func.default;
      }

      exitCode = await func(client);
    }
  } catch (err: unknown) {
    if (isErrnoException(err) && err.code === 'ENOTFOUND') {
      // Error message will look like the following:
      // "request to https://api.vercel.com/v2/user failed, reason: getaddrinfo ENOTFOUND api.vercel.com"
      const matches = /getaddrinfo ENOTFOUND (.*)$/.exec(err.message || '');

      if (matches && matches[1]) {
        const hostname = matches[1];
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

    if (err instanceof APIError && 400 <= err.status && err.status <= 499) {
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
      output.error(`An unexpected error occurred in ${subcommand}: ${err}`);
    }

    return 1;
  }

  return exitCode;
};

const handleRejection = async (err: any) => {
  debug('handling rejection');

  if (err) {
    if (err instanceof Error) {
      await handleUnexpected(err);
    } else {
      // eslint-disable-next-line no-console
      console.error(errorOutput(`An unexpected rejection occurred\n  ${err}`));
    }
  } else {
    // eslint-disable-next-line no-console
    console.error(errorOutput('An unexpected empty rejection occurred'));
  }

  process.exit(1);
};

const handleUnexpected = async (err: Error) => {
  const { message } = err;

  // We do not want to render errors about Sentry not being reachable
  if (message.includes('sentry') && message.includes('ENOTFOUND')) {
    debug(`Sentry is not reachable: ${err}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.error(errorOutput(`An unexpected error occurred!\n${err.stack}`));

  process.exit(1);
};

process.on('unhandledRejection', handleRejection);
process.on('uncaughtException', handleUnexpected);

main()
  .then(async (exitCode) => {
    process.exitCode = exitCode;
  })
  .catch(handleUnexpected);
