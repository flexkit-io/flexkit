import fs from 'node:fs';
import path from 'node:path';
import { SchemaSerializationError, serializeConfig } from '@flexkit/schema';
import type { Config, UiProjectSchema } from '@flexkit/schema';
import { fileNameSymbol } from '../types';
import type { FlexkitConfig } from '../types';
import { bundleAndImport } from './bundle-module';
import { InvalidProjectConfig, CantFindConfig, WorkingDirectoryDoesNotExist } from './error-types';
import humanizePath from './humanize-path';
import type { Output } from './output';
import { isErrnoException } from './error-utils';

const candidates = ['flexkit.config.ts', 'flexkit.config.js', 'flexkit.config.mjs'];
/** Config files from the JSX era. They are refused with migration guidance instead of bundled. */
const legacyCandidates = ['flexkit.config.tsx', 'flexkit.config.jsx'];
const legacyConfigMessage =
  'flexkit.config.tsx is no longer supported. Rename it to flexkit.config.ts, replace icon components with lucide icon names (e.g. icon: "Tag"), use booleans for hidden/readOnly, and remove extensions, basePath and commands. See https://flexkit.io/docs/schema/schema-configuration.';
let config: FlexkitConfig | undefined;

export default async function getConfig(
  output: Output,
  configFile?: string
): Promise<FlexkitConfig | InvalidProjectConfig | Error> {
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

    if (!fs.existsSync(localFilePath)) {
      return new CantFindConfig([humanizePath(localFilePath)]);
    }

    if (isLegacyConfigPath(localFilePath)) {
      return new InvalidProjectConfig(legacyConfigMessage, localFilePath);
    }

    output.debug(`Found config in provided --local-config path ${localFilePath}`);

    const projects = await getProjectConfig(localFilePath);

    if (projects instanceof InvalidProjectConfig) {
      return projects;
    }

    config = {
      [fileNameSymbol]: localFilePath,
      projects,
    };

    return config;
  }

  // Then try with `flexkit.config.[ts|js|mjs]` in the same directory
  const configFilePath = candidates
    .map((candidate) => path.join(localPath, candidate))
    .find((candidate) => fs.existsSync(candidate));

  if (!configFilePath) {
    const legacyConfigPath = legacyCandidates
      .map((candidate) => path.join(localPath, candidate))
      .find((candidate) => fs.existsSync(candidate));

    if (legacyConfigPath) {
      return new InvalidProjectConfig(legacyConfigMessage, legacyConfigPath);
    }

    return new CantFindConfig([humanizePath(localPath)]);
  }

  output.debug(`Attempting to read config from ${configFilePath}`);

  const projects = await getProjectConfig(configFilePath);

  if (projects instanceof InvalidProjectConfig) {
    return projects;
  }

  config = {
    [fileNameSymbol]: configFilePath,
    projects,
  };

  return config;
}

function isLegacyConfigPath(filePath: string): boolean {
  return /\.(tsx|jsx)$/.test(filePath);
}

/** Test seam: forget the cached config so another file can be loaded. */
export function resetConfigCache(): void {
  config = undefined;
}

async function getProjectConfig(configFilePath: string): Promise<UiProjectSchema[] | InvalidProjectConfig> {
  try {
    // `defineConfig` / `defineEntity` live in @flexkit/schema. Configs written
    // against @flexkit/studio keep working without pulling the browser bundle
    // (CSS, React) into a Node process.
    const tempConfigFile = await bundleAndImport<{ default?: Config }>(configFilePath, {
      aliasToOwn: { filter: /^@flexkit\/(schema|studio)$/, packageName: '@flexkit/schema' },
    });

    if (!tempConfigFile.default) {
      return new InvalidProjectConfig('The config file must export the result of defineConfig() as default.', configFilePath);
    }

    // Serialize to pure data: validation becomes JSON Schema, anything else is dropped or rejected.
    return serializeConfig(tempConfigFile.default);
  } catch (error) {
    if (error instanceof SchemaSerializationError) {
      return new InvalidProjectConfig(error.message, configFilePath);
    }

    return new InvalidProjectConfig(error instanceof Error ? error.message : String(error), configFilePath);
  }
}
