import chalk from 'chalk';
import parseArguments from '../../util/parse-args';
import type Client from '../../util/client';
import { help } from '../help';
import { reportError, SHARED_FLAGS } from '../../util/command-group';
import { resolveProjectId } from '../../util/project-context';
import { graphqlRequest } from '../../util/graphql';
import { printJson } from '../../util/output/format';
import { parseKeyValues, readJsonInput, readTextInput } from '../../util/read-input';
import { queryCommand } from './command';

const FLAGS = {
  ...SHARED_FLAGS,
  '--var': [String] as [StringConstructor],
  '--variables': String,
  '--data-only': Boolean,
};

export default async function main(client: Client): Promise<number> {
  const { output } = client;
  let argv;

  try {
    argv = parseArguments(client.argv.slice(2), FLAGS);
  } catch (err: unknown) {
    output.error(err instanceof Error ? err.message : String(err));

    return 1;
  }

  const [, input] = argv.args;

  if (argv.flags['--help'] || !input) {
    output.print(help(queryCommand, { columns: client.stderr.columns }));

    return argv.flags['--help'] ? 2 : 1;
  }

  const resolved = resolveProjectId(client, argv.flags['--project']);

  if (!resolved) {
    return 1;
  }

  try {
    const operation = (await readTextInput(client, input)).trim();

    if (!operation) {
      output.error('The GraphQL operation is empty.');

      return 1;
    }

    const fromJson = argv.flags['--variables']
      ? await readJsonInput<Record<string, unknown>>(client, argv.flags['--variables'], '--variables value')
      : {};
    const variables = { ...fromJson, ...parseKeyValues(argv.flags['--var']) };
    const response = await graphqlRequest<unknown>(client, resolved.projectId, operation, variables);

    if (argv.flags['--data-only']) {
      printJson(client, response.data ?? null);
    } else {
      printJson(client, response);
    }

    if (response.errors && response.errors.length > 0) {
      for (const error of response.errors) {
        output.print(`${chalk.red('GraphQL error:')} ${error.message}\n`);
      }

      return 1;
    }

    return 0;
  } catch (err: unknown) {
    return reportError(client, err);
  }
}
