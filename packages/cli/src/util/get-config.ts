import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { fileNameSymbol } from '../types';
import type { FlexkitConfig, ProjectConfig } from '../types';
import { InvalidProjectConfig, CantFindConfig, WorkingDirectoryDoesNotExist } from './error-types';
import humanizePath from './humanize-path';
import type { Output } from './output';
import { isErrnoException } from './error-utils';

const candidates = ['flexkit.config.js', 'flexkit.config.jsx', 'flexkit.config.ts', 'flexkit.config.tsx'];
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

    output.debug(`Found config in provided --local-config path ${localFilePath}`);

    const projectConfig = await getProjectConfig(localFilePath);

    if (projectConfig instanceof InvalidProjectConfig) {
      return projectConfig;
    }

    const normalizedConfig = Array.isArray(projectConfig) ? projectConfig : [projectConfig];

    config = {
      [fileNameSymbol]: configFile,
      projects: normalizedConfig,
    };

    return config;
  }

  // Then try with `flexkit.config.[js|ts|jsx|tsx]` in the same directory
  const configFilePath =
    candidates.map((candidate) => path.join(localPath, candidate)).find((candidate) => fs.existsSync(candidate)) ??
    'not-found';

  if (configFilePath === 'not-found') {
    return new CantFindConfig([humanizePath(localPath)]);
  }

  output.debug(`Attempting to read config from ${configFilePath}`);

  const projectConfig = await getProjectConfig(configFilePath);

  if (projectConfig instanceof InvalidProjectConfig) {
    return projectConfig;
  }

  const normalizedConfig = Array.isArray(projectConfig) ? projectConfig : [projectConfig];

  config = {
    [fileNameSymbol]: configFile,
    projects: normalizedConfig,
  };

  return config;
}

async function getProjectConfig(configFilePath: string): Promise<ProjectConfig | InvalidProjectConfig> {
  const contextFolder = path.dirname(configFilePath);
  let tempOutputPath;

  try {
    tempOutputPath = path.resolve(contextFolder, `${generateRandomFilename()}-temp.mjs`);

    await esbuild.build({
      entryPoints: [configFilePath],
      bundle: true,
      outfile: tempOutputPath,
      format: 'esm',
      platform: 'node',
      target: 'node16',
      ignoreAnnotations: true,
      loader: {
        '.css': 'empty',
      },
      banner: {
        js: `
          import { createRequire } from 'module';
          import __flexkitReact from 'react';
          const require = createRequire(import.meta.url);
          globalThis.React = __flexkitReact;
          globalThis.__require = require;
          globalThis.__util = require('util');
        `,
      },
      plugins: [
        {
          name: 'handle-node-builtins',
          setup(build) {
            build.onResolve({ filter: /^react(?:\/jsx-runtime|\/jsx-dev-runtime)?$/ }, (args) => ({
              path: args.path,
              external: true,
            }));

            build.onResolve({ filter: /^react-dom(?:\/client|\/server|\/test-utils)?$/ }, (args) => ({
              path: args.path,
              external: true,
            }));

            build.onResolve({ filter: /^util$/ }, () => ({
              path: 'util-stub',
              namespace: 'node-builtin',
            }));

            build.onResolve({ filter: /^(?:tty|os|path|fs|stream|events|assert|process)$/ }, (args) => ({
              path: args.path,
              namespace: 'node-builtin',
            }));

            build.onLoad({ filter: /^util-stub$/, namespace: 'node-builtin' }, () => ({
              contents: `
                const util = globalThis.__util;
                export default util;
                export const {
                  deprecate,
                  format,
                  inspect,
                  promisify,
                  types,
                  // Add other util exports you need
                } = util;
              `,
              loader: 'js',
            }));

            build.onLoad({ filter: /.*/, namespace: 'node-builtin' }, (args) => ({
              contents: `
                export default globalThis.__require('${args.path}');
                export * from '${args.path}';
              `,
              loader: 'js',
            }));
          },
        },
        {
          name: 'handle-css',
          setup(build) {
            build.onResolve({ filter: /\.css$/ }, () => ({
              path: 'empty-css',
              namespace: 'css-stub',
            }));

            build.onLoad({ filter: /.*/, namespace: 'css-stub' }, () => ({
              contents: `export default {};`,
              loader: 'js',
            }));
          },
        },
      ],
      external: [
        // Mark all node_modules as external
        '/node_modules/*',
        // And Node.js built-ins
        'tty',
        'os',
        'path',
        'fs',
        'util',
        'stream',
        'events',
        'assert',
        'process',
      ],
      mainFields: ['module', 'main'], // Prioritize module field in package.json
      logLevel: 'warning', // Reduce noise in logs
    });

    // Import the bundled config
    const tempConfigFile = await import(tempOutputPath);

    // Clean up
    fs.unlinkSync(tempOutputPath);

    // Get the config and transform it to keep only needed fields
    const rawConfig: ProjectConfig = (tempConfigFile as { default: ProjectConfig }).default;
    const transformedConfig = transformConfig(rawConfig) as ProjectConfig;

    return transformedConfig;
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(error as string);

    // Clean up the temporary file
    if (tempOutputPath) {
      fs.unlinkSync(tempOutputPath);
    }

    return new InvalidProjectConfig(normalizedError.message, configFilePath);
  }
}

function transformConfig(rawConfig: ProjectConfig | ProjectConfig[]): ProjectConfig | ProjectConfig[] {
  const transform = (item: ProjectConfig): ProjectConfig => {
    if (Array.isArray(item)) {
      return item;
    }

    const { title, projectId, schema, scopes, basePath = '' } = item;
    return { title, projectId, schema, scopes, basePath };
  };

  return Array.isArray(rawConfig) ? rawConfig.map(transform) : transform(rawConfig);
}

function generateRandomFilename(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let filename = '';

  for (let i = 0; i < length; i++) {
    filename += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return filename;
}
