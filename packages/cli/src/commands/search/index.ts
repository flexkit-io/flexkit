import chalk from 'chalk';
import parseArguments from '../../util/parse-args';
import type Client from '../../util/client';
import { help } from '../help';
import { reportError, SHARED_FLAGS } from '../../util/command-group';
import { resolveProjectId } from '../../util/project-context';
import { getCommandName } from '../../util/pkg';
import { printJson, printTable, truncate } from '../../util/output/format';
import { fetchRecordSchema, resolveScope } from '../records/schema';
import { searchCommand } from './command';
import {
  buildSearchRequest,
  DEFAULT_SEARCH_LIMIT,
  flattenSearchResults,
  MAX_SEARCH_LIMIT,
  selectSearchEntities,
  type SearchResponse,
} from './results';

const FLAGS = {
  ...SHARED_FLAGS,
  '--entity': [String] as [StringConstructor],
  '-e': '--entity',
  '--limit': Number,
  '-n': '--limit',
  '--scope': String,
};

export default async function main(client: Client): Promise<number> {
  const { output } = client;
  let argv;

  try {
    argv = parseArguments(client.argv.slice(2), FLAGS);
  } catch (err: unknown) {
    output.error(
      `${err instanceof Error ? err.message : String(err)}. Run ${getCommandName('search --help')} for usage.`
    );

    return 1;
  }

  const text = argv.args.slice(1).join(' ').trim();

  if (argv.flags['--help'] || !text) {
    output.print(help(searchCommand, { columns: client.stderr.columns }));

    return argv.flags['--help'] ? 2 : 1;
  }

  const limit = argv.flags['--limit'] ?? DEFAULT_SEARCH_LIMIT;

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_LIMIT) {
    output.error(`--limit must be a whole number from 1 to ${MAX_SEARCH_LIMIT.toString()}.`);

    return 1;
  }

  const resolved = resolveProjectId(client, argv.flags['--project']);

  if (!resolved) {
    return 1;
  }

  const { projectId } = resolved;
  try {
    output.spinner('Searching');
    const schema = await fetchRecordSchema(client, projectId);
    const scope = resolveScope(schema, argv.flags['--scope']);
    const entities = selectSearchEntities(schema, argv.flags['--entity']);

    if (entities.length === 0) {
      output.stopSpinner();
      output.error('The project has no deployed entities to search.');

      return 1;
    }

    const response = await client.fetch<SearchResponse>('/search', {
      projectId,
      method: 'POST',
      body: { ...buildSearchRequest(entities, text, limit) },
    });
    output.stopSpinner();
    const hits = flattenSearchResults(entities, response, scope, limit);

    if (argv.flags['--json']) {
      printJson(client, hits);

      return 0;
    }

    printTable(
      client,
      ['entity', '_id', 'label', 'score'],
      hits.map((hit) => [hit.entity, hit._id, truncate(hit.label, 60), chalk.dim(hit.score.toFixed(2))]),
      `No records match "${text}".`
    );

    return 0;
  } catch (err: unknown) {
    output.stopSpinner();

    return reportError(client, err);
  }
}
