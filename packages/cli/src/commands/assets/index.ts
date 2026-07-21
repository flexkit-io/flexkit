import parseArguments from '../../util/parse-args';
import { handleError } from '../../util/handle-error';
import { getCommandName } from '../../util/pkg';
import { resolveProject } from '../../util/get-project';
import { help } from '../help';
import { assetsCommand, assetsExportCommand, assetsUploadCommand } from './command';
import uploadAssets from './upload';
import exportAssets from './export';
import type Client from '../../util/client';

function printHelp(client: Client, subcommand: string | undefined): number {
  const { columns } = client.stderr;

  if (subcommand === 'upload') {
    client.output.print(help(assetsUploadCommand, { columns }));

    return 2;
  }

  if (subcommand === 'export') {
    client.output.print(help(assetsExportCommand, { columns }));

    return 2;
  }

  client.output.print(help(assetsCommand, { columns }));

  return 2;
}

export default async function main(client: Client): Promise<number> {
  let argv;

  try {
    argv = parseArguments(client.argv.slice(2), {
      '--help': Boolean,
      '-h': '--help',
      '--json': Boolean,
      '--project': String,
      '--concurrency': Number,
      '--id-from': String,
      '--tag': String,
      '--overwrite': Boolean,
    });
  } catch (err: unknown) {
    handleError(err);

    return 1;
  }

  const [, subcommand, ...rest] = argv.args;

  if (argv.flags['--help']) {
    return printHelp(client, subcommand);
  }

  if (!subcommand) {
    client.output.error(
      `No subcommand provided. Use ${getCommandName('assets --help')} to see available assets subcommands.`
    );

    return 1;
  }

  const project = resolveProject(client, argv.flags['--project']);

  if (!project) {
    return 1;
  }

  const concurrency = argv.flags['--concurrency'] ?? 5;

  if (subcommand === 'upload') {
    return uploadAssets(client, project.projectId, rest, {
      concurrency,
      idFrom: argv.flags['--id-from'],
      tag: argv.flags['--tag'],
      json: argv.flags['--json'] ?? false,
    });
  }

  if (subcommand === 'export') {
    return exportAssets(client, project.projectId, rest[0], {
      concurrency,
      tag: argv.flags['--tag'],
      overwrite: argv.flags['--overwrite'] ?? false,
    });
  }

  client.output.error(`The ${subcommand} subcommand does not exist`);

  return 1;
}
