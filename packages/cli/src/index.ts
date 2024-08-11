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
import getGlobalPathConfig from './util/config/global-path';
import parseArguments from './util/parse-args';
import { APIError } from './util/error-types';
import { errorOutput, highlightOutput, paramOutput, Output } from './util/output';
import hp from './util/humanize-path';
import pkg from './util/pkg';
import { help } from './args';
import type { AuthConfig, GlobalConfig } from './types';

const FLEXKIT_DIR = getGlobalPathConfig();
let { isTTY } = process.stdout;
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
          `An unexpected error occurred while trying to save the config to "${hp(VERCEL_CONFIG_PATH)}" ${errorToString(
            err
          )}`
        );
        return 1;
      }
    } else {
      output.error(
        `An unexpected error occurred while trying to read the config in "${hp(VERCEL_CONFIG_PATH)}" ${errorToString(
          err
        )}`
      );
      return 1;
    }
  }

  // The second argument to the command can be:
  //
  //  * a path to deploy (as in: `vercel path/`)
  //  * a subcommand (as in: `vercel ls`)
  const subcommand = argv.args[2];
  const subSubCommand = argv.args[3];

  console.log(subcommand, subSubCommand);

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
};

main().then(async (exitCode) => {
  //process.exitCode = exitCode;
});
