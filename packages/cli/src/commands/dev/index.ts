import fs from 'node:fs';
import { hostname } from 'node:os';
import path from 'node:path';
import { startDevConnect, type DevConnectHandle } from '@flexkit/tools/dev';
import type Client from '../../util/client';
import { isTempBundle } from '../../util/bundle-module';
import { loadEnvFiles } from '../../util/env-file';
import { CantFindToolsFile, InvalidToolsFile, loadToolsDefinition, resolveToolsFile } from '../../util/get-tools';
import { resolveProject } from '../../util/get-project';
import { handleError } from '../../util/handle-error';
import parseArguments from '../../util/parse-args';
import { getCommandName } from '../../util/pkg';
import { help } from '../help';
import { devCommand } from './command';
import { formatDevEvent } from './events';

const RELOAD_DEBOUNCE_MS = 150;

function getProjectApiOrigin(client: Client, projectId: string): string {
  return client.apiUrl.replace('https://', `https://${projectId}.`);
}

function getClientLabel(cwd: string): string {
  let name = path.basename(cwd);

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')) as { name?: string };
    name = pkg.name?.trim() || name;
  } catch {
    // Not every tools folder is a package.
  }

  return `flexkit dev · ${name}@${hostname().replace(/\.local$/, '')}`;
}

export default async function main(client: Client): Promise<number> {
  let argv;
  const { output } = client;

  try {
    argv = parseArguments(client.argv.slice(2), {
      '--env-file': [String],
      '--help': Boolean,
      '-h': '--help',
      '--no-watch': Boolean,
      '--project': String,
      '--tools-file': String,
    });
  } catch (err: unknown) {
    handleError(err);

    return 1;
  }

  if (argv.flags['--help']) {
    output.print(help(devCommand, { columns: client.stderr.columns }));

    return 2;
  }

  const token = client.authConfig.token ?? '';

  if (token.startsWith('flk-')) {
    output.error(
      `${getCommandName('dev')} needs a user session, not an API token. Run ${getCommandName('login')} without --token.`
    );

    return 1;
  }

  const project = resolveProject(client, argv.flags['--project']);

  if (!project) {
    return 1;
  }

  const { cwd } = client;
  let toolsFilePath: string;

  try {
    toolsFilePath = resolveToolsFile(cwd, argv.flags['--tools-file']);
  } catch (error) {
    if (error instanceof CantFindToolsFile) {
      output.error(`${error.message} Create one with defineTools() from @flexkit/tools or pass --tools-file.`);

      return 1;
    }

    throw error;
  }

  try {
    const env = loadEnvFiles(cwd, argv.flags['--env-file']);

    if (env.unsupported) {
      output.warn('This Node.js version cannot load .env files (needs 20.12+). Export the variables yourself.');
    } else if (env.loaded.length > 0) {
      output.dim(`Loaded ${env.loaded.join(', ')}`);
    }
  } catch (error) {
    output.error(error instanceof Error ? error.message : String(error));

    return 1;
  }

  let definition;

  try {
    definition = await loadToolsDefinition(output, toolsFilePath);
  } catch (error) {
    if (error instanceof InvalidToolsFile) {
      output.error(`Could not load ${error.file}:\n${error.message}`);

      return 1;
    }

    throw error;
  }

  const { projectId } = project;
  let exitCode = 0;
  let handle: DevConnectHandle | undefined;

  output.log(`Starting local runtime for ${projectId} from ${path.relative(cwd, toolsFilePath) || toolsFilePath}`);

  handle = startDevConnect({
    apiOrigin: getProjectApiOrigin(client, projectId),
    clientLabel: getClientLabel(cwd),
    definition,
    onEvent: (event) => {
      if (event.type === 'denied') {
        exitCode = 1;
      }

      const line = formatDevEvent(event, projectId);

      if (!line) {
        return;
      }

      if (line.level === 'error') {
        output.error(line.text);
      } else if (line.level === 'warn') {
        output.warn(line.text);
      } else {
        output.log(line.text);
      }
    },
    token,
  });

  let watcher: fs.FSWatcher | undefined;

  if (!argv.flags['--no-watch']) {
    let reloadTimer: NodeJS.Timeout | undefined;
    let reloading = false;
    let reloadRequested = false;

    // A save that lands while a bundle is in progress is remembered and
    // applied right after, so the runtime never keeps stale tools.
    const reload = async (): Promise<void> => {
      if (reloading) {
        reloadRequested = true;

        return;
      }

      reloading = true;

      try {
        do {
          reloadRequested = false;

          try {
            const next = await loadToolsDefinition(output, toolsFilePath);
            handle?.update(next);
            output.log(
              `Reloaded ${path.basename(toolsFilePath)}: ${String(next.tools.length)} tools, ${String(next.skills.length)} skills`
            );
          } catch (error) {
            output.error(
              `Reload failed, keeping the previous tools: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        } while (reloadRequested);
      } finally {
        reloading = false;
      }
    };

    // Watching the folder (not the single file) survives editors that replace files on save.
    watcher = fs.watch(path.dirname(toolsFilePath), { recursive: false }, (_event, changed) => {
      const name = String(changed ?? '');

      // Ignore the bundle this command writes next to the file, or every reload triggers another.
      if (!name || isTempBundle(name) || !/\.(ts|js|mjs|cjs|mts|cts)$/.test(name)) {
        return;
      }

      if (reloadTimer) {
        clearTimeout(reloadTimer);
      }

      reloadTimer = setTimeout(() => {
        void reload();
      }, RELOAD_DEBOUNCE_MS);
    });
  }

  const stop = (): void => {
    output.log('Stopping local runtime…');
    watcher?.close();
    handle?.stop();
  };

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    await handle.done;
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    watcher?.close();
  }

  return exitCode;
}
