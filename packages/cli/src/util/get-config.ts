import path from 'node:path';
import { fileNameSymbol } from '../types';
import { CantParseJSONFile, CantFindConfig, WorkingDirectoryDoesNotExist } from './error-types';
import humanizePath from './humanize-path';
import readJSONFile from './read-json-file';
import { FlexkitConfig } from '../types';
import { Output } from './output';
import { isErrnoException } from './error-utils';

let config: FlexkitConfig;

export default async function getConfig(output: Output, configFile?: string): Promise<FlexkitConfig | Error> {
  // If config was already read, just return it
  if (config) {
    return config;
  }

  let localPath: string;
  try {
    localPath = process.cwd();
  } catch (err: unknown) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      return new WorkingDirectoryDoesNotExist();
    }
    throw err;
  }

  // First try with the config supplied by the user via --local-config
  if (configFile) {
    const localFilePath = path.resolve(localPath, configFile);
    output.debug(`Found config in provided --local-config path ${localFilePath}`);
    const localConfig = await readJSONFile<FlexkitConfig>(localFilePath);

    if (localConfig instanceof CantParseJSONFile) {
      return localConfig;
    }

    if (localConfig === null) {
      return new CantFindConfig([humanizePath(localFilePath)]);
    }

    config = localConfig;
    config[fileNameSymbol] = configFile;

    return config;
  }

  // Then try with `flexkit.json` in the same directory
  const flexkitFilePath = path.resolve(localPath, 'flexkit.json');
  const vercelConfig = await readJSONFile<FlexkitConfig>(flexkitFilePath);

  if (vercelConfig instanceof CantParseJSONFile) {
    return vercelConfig;
  }

  if (vercelConfig !== null) {
    output.debug(`Found config in file "${flexkitFilePath}"`);
    config = vercelConfig;
    config[fileNameSymbol] = 'flexkit.json';

    return config;
  }

  // If we couldn't find the config anywhere return error
  return new CantFindConfig([humanizePath(flexkitFilePath)]);
}
