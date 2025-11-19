import { join } from 'node:path';
import loadJSON from 'load-json-file';
import { sync as writeJsonFileSync } from 'write-json-file';
import type { AuthConfig, GlobalConfig } from '../../types';
import { errorOutput } from '../output/error';
import { highlightOutput } from '../output/highlight';
import { isErrnoException } from '../error-utils';
import getGlobalPathConfig from './global-path';

const FLEXKIT_DIR = getGlobalPathConfig();
const CONFIG_FILE_PATH = join(FLEXKIT_DIR, 'config.json');
const AUTH_CONFIG_FILE_PATH = join(FLEXKIT_DIR, 'auth.json');

// reads "global config" file atomically
export const readConfigFile = (): GlobalConfig => {
  const config = loadJSON.sync(CONFIG_FILE_PATH);

  return config as GlobalConfig;
};

// writes whatever's in `stuff` to "global config" file, atomically
export const writeToConfigFile = (stuff: GlobalConfig): void => {
  try {
    writeJsonFileSync(CONFIG_FILE_PATH, stuff, { indent: 2 });
  } catch (err: unknown) {
    if (isErrnoException(err)) {
      if (isErrnoException(err) && err.code === 'EPERM') {
        // eslint-disable-next-line no-console -- CLI output
        console.error(
          errorOutput(`Not able to create ${highlightOutput(CONFIG_FILE_PATH)} (operation not permitted).`)
        );
        process.exit(1);
      } else if (err.code === 'EBADF') {
        // eslint-disable-next-line no-console -- CLI output
        console.error(errorOutput(`Not able to create ${highlightOutput(CONFIG_FILE_PATH)} (bad file descriptor).`));
        process.exit(1);
      }
    }

    throw err;
  }
};

// reads "auth config" file atomically
export const readAuthConfigFile = (): AuthConfig => {
  const config = loadJSON.sync(AUTH_CONFIG_FILE_PATH);

  return config as AuthConfig;
};

export const writeToAuthConfigFile = (authConfig: AuthConfig): void => {
  if (authConfig.skipWrite) {
    return;
  }

  try {
    writeJsonFileSync(AUTH_CONFIG_FILE_PATH, authConfig, {
      indent: 2,
      mode: 0o600,
    });
  } catch (err: unknown) {
    if (isErrnoException(err)) {
      if (err.code === 'EPERM') {
        // eslint-disable-next-line no-console -- CLI output
        console.error(
          errorOutput(`Not able to create ${highlightOutput(AUTH_CONFIG_FILE_PATH)} (operation not permitted).`)
        );
        process.exit(1);
      } else if (err.code === 'EBADF') {
        // eslint-disable-next-line no-console -- CLI output
        console.error(
          errorOutput(`Not able to create ${highlightOutput(AUTH_CONFIG_FILE_PATH)} (bad file descriptor).`)
        );
        process.exit(1);
      }
    }

    throw err;
  }
};

export function getConfigFilePath(): string {
  return CONFIG_FILE_PATH;
}

export function getAuthConfigFilePath(): string {
  return AUTH_CONFIG_FILE_PATH;
}
