import fs from 'node:fs';
import { createRequire, isBuiltin } from 'node:module';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { SchemaSerializationError, serializeConfig } from '@flexkit/schema';
import type { Config, UiProjectSchema } from '@flexkit/schema';
import { fileNameSymbol } from '../types';
import type { FlexkitConfig } from '../types';
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

/**
 * Resolves `@flexkit/schema` from the CLI's own installation so a config file
 * bundles even when the user's project does not list the package (it may only
 * have `@flexkit/studio`, which re-exports it). Works for the published CJS
 * build (`require`) and the ESM test build (`import.meta.url`).
 */
function resolveOwnSchemaPackage(): string | undefined {
  try {
    if (typeof require === 'function') {
      return require.resolve('@flexkit/schema');
    }
  } catch {
    // fall through
  }

  try {
    return createRequire(import.meta.url).resolve('@flexkit/schema');
  } catch {
    return undefined;
  }
}

function removeTempOutput(tempOutputPath: string | undefined): void {
  if (!tempOutputPath) {
    return;
  }

  try {
    fs.rmSync(tempOutputPath, { force: true });
  } catch {
    // A failed bundle never writes this file. Ignore cleanup errors so the original failure is returned.
  }
}

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
  const contextFolder = path.dirname(configFilePath);
  let tempOutputPath: string | undefined;

  try {
    tempOutputPath = path.resolve(contextFolder, `${generateRandomFilename()}-temp.mjs`);
    const ownSchemaPackage = resolveOwnSchemaPackage();

    await esbuild.build({
      entryPoints: [configFilePath],
      bundle: true,
      outfile: tempOutputPath,
      format: 'esm',
      platform: 'node',
      target: 'node18',
      ignoreAnnotations: true,
      banner: {
        js: `
          import { createRequire as __flexkitCreateRequire } from 'module';
          const require = __flexkitCreateRequire(import.meta.url);
        `,
      },
      plugins: [
        {
          name: 'flexkit-config-resolution',
          setup(build) {
            // `defineConfig` / `defineEntity` live in @flexkit/schema. Configs
            // written against @flexkit/studio keep working without pulling the
            // browser bundle (CSS, React) into a Node process.
            build.onResolve({ filter: /^@flexkit\/(schema|studio)$/ }, async (args) => {
              if (args.pluginData === 'flexkit-config-resolution') {
                return undefined;
              }

              if (ownSchemaPackage) {
                return { path: ownSchemaPackage };
              }

              const resolved = await build.resolve('@flexkit/schema', {
                kind: args.kind,
                resolveDir: args.resolveDir,
                pluginData: 'flexkit-config-resolution',
              });

              return resolved.errors.length > 0 ? { errors: resolved.errors } : { path: resolved.path };
            });

            // Keep Node builtins as real imports so named exports such as
            // `Readable` survive. `isBuiltin` follows the running Node version,
            // including `node:` prefixes and subpaths. The banner's `require`
            // serves CommonJS `require("stream")` calls inside the ESM bundle.
            build.onResolve({ filter: /.*/ }, (args) => {
              if (!isBuiltin(args.path)) {
                return undefined;
              }

              return {
                path: args.path,
                external: true,
              };
            });
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
    const tempConfigFile = (await import(tempOutputPath)) as { default?: Config };

    removeTempOutput(tempOutputPath);

    if (!tempConfigFile.default) {
      return new InvalidProjectConfig('The config file must export the result of defineConfig() as default.', configFilePath);
    }

    // Serialize to pure data: validation becomes JSON Schema, anything else is dropped or rejected.
    return serializeConfig(tempConfigFile.default);
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    removeTempOutput(tempOutputPath);

    if (error instanceof SchemaSerializationError) {
      return new InvalidProjectConfig(error.message, configFilePath);
    }

    return new InvalidProjectConfig(normalizedError.message, configFilePath);
  }
}

function generateRandomFilename(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let filename = '';

  for (let i = 0; i < length; i++) {
    filename += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return filename;
}
