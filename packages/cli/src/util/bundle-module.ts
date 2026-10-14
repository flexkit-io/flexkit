import fs from 'node:fs';
import { createRequire, isBuiltin } from 'node:module';
import path from 'node:path';
import * as esbuild from 'esbuild';

export interface BundleModuleOptions {
  /**
   * Bare specifiers (regex) to redirect to a package resolved from the CLI's
   * own installation, so a file bundles even when the user's project does not
   * list that package. Used for `@flexkit/schema` in `flexkit.config.ts`.
   */
  aliasToOwn?: { filter: RegExp; packageName: string };
  /** Bare specifiers (regex) to keep as real imports, resolved from the user's project. */
  external?: RegExp[];
}

/**
 * Resolves a package from the CLI's own installation. Works for the published
 * CJS build (`require`) and the ESM test build (`import.meta.url`).
 */
export function resolveOwnPackage(packageName: string): string | undefined {
  try {
    if (typeof require === 'function') {
      return require.resolve(packageName);
    }
  } catch {
    // fall through
  }

  try {
    return createRequire(import.meta.url).resolve(packageName);
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

const TEMP_BUNDLE_SUFFIX = '-temp.mjs';

/** True for the temporary bundle files this module writes next to the source file. */
export function isTempBundle(fileName: string): boolean {
  return fileName.endsWith(TEMP_BUNDLE_SUFFIX);
}

function generateRandomFilename(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let filename = '';

  for (let i = 0; i < length; i++) {
    filename += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return filename;
}

/**
 * Bundles a TypeScript/JavaScript module with esbuild into a temporary ESM
 * file next to it, imports it and removes the file again. Node builtins and
 * `node_modules` stay external so the user's dependencies resolve from their
 * project.
 */
export async function bundleAndImport<T>(filePath: string, options: BundleModuleOptions = {}): Promise<T> {
  const contextFolder = path.dirname(filePath);
  const tempOutputPath = path.resolve(contextFolder, `${generateRandomFilename()}${TEMP_BUNDLE_SUFFIX}`);
  const ownPackage = options.aliasToOwn ? resolveOwnPackage(options.aliasToOwn.packageName) : undefined;
  const { aliasToOwn, external = [] } = options;

  try {
    await esbuild.build({
      entryPoints: [filePath],
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
          name: 'flexkit-module-resolution',
          setup(build) {
            if (aliasToOwn) {
              build.onResolve({ filter: aliasToOwn.filter }, async (args) => {
                if (args.pluginData === 'flexkit-module-resolution') {
                  return undefined;
                }

                if (ownPackage) {
                  return { path: ownPackage };
                }

                const resolved = await build.resolve(aliasToOwn.packageName, {
                  kind: args.kind,
                  resolveDir: args.resolveDir,
                  pluginData: 'flexkit-module-resolution',
                });

                return resolved.errors.length > 0 ? { errors: resolved.errors } : { path: resolved.path };
              });
            }

            for (const filter of external) {
              build.onResolve({ filter }, (args) => ({ path: args.path, external: true }));
            }

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

    // Cache-bust so a rebuilt file (watch mode) is imported fresh.
    return (await import(`${tempOutputPath}?t=${String(Date.now())}`)) as T;
  } finally {
    removeTempOutput(tempOutputPath);
  }
}
