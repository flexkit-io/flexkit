import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import type Client from '../../util/client';
import { confirmAction, runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import { formatGraphQLErrors, graphqlRequest } from '../../util/graphql';
import { formatRelativeTime, printDetails, printJson, printTable, truncate } from '../../util/output/format';
import { parseKeyValues, readJsonInput } from '../../util/read-input';
import { capitalize } from '../../util/import/schema';
import {
  recordsCommand,
  recordsCountCommand,
  recordsCreateCommand,
  recordsGetCommand,
  recordsListCommand,
  recordsRemoveCommand,
  recordsUpdateCommand,
} from './command';
import {
  buildCountQuery,
  buildCreateInput,
  buildCreateMutation,
  buildDeleteMutation,
  buildDeleteVariables,
  buildListQuery,
  buildUpdateInput,
  buildUpdateMutation,
  formatCellValue,
  getAllFields,
  getDefaultListFields,
  getUpdateReadFields,
  mergeRecordData,
  normalizeRecord,
  parseFields,
  parseSort,
  type Field,
} from './operations';
import { fetchRecordSchema, requireEntity, resolveScope, type RecordEntity, type RecordSchema } from './schema';

type Json = { [key: string]: unknown };

const DEFAULT_LIMIT = 20;
const DEFAULT_SORT = [{ _createdAt: 'DESC' }];

async function loadEntity(ctx: SubcommandContext): Promise<{ schema: RecordSchema; entity: RecordEntity }> {
  ctx.client.output.spinner('Loading schema');
  const schema = await fetchRecordSchema(ctx.client, ctx.projectId);
  const entity = requireEntity(schema, ctx.args[0] ?? '');

  return { schema, entity };
}

/** Runs a GraphQL operation and throws its errors as one message. */
async function runGraphql<T>(ctx: SubcommandContext, query: string, variables: Json): Promise<T> {
  const response = await graphqlRequest<T>(ctx.client, ctx.projectId, query, variables);

  if (response.errors?.length) {
    throw new Error(formatGraphQLErrors(response.errors));
  }

  if (!response.data) {
    throw new Error('The GraphQL API returned no data.');
  }

  return response.data;
}

async function readWhere(ctx: SubcommandContext): Promise<Json | undefined> {
  const value = ctx.flags['--where'] as string | undefined;

  if (!value) {
    return undefined;
  }

  const where = await readJsonInput<unknown>(ctx.client, value, '--where value');

  if (typeof where !== 'object' || where === null || Array.isArray(where)) {
    throw new Error('--where must be a JSON object, for example {"status":{"eq":"draft"}}.');
  }

  return where as Json;
}

async function readRecordData(ctx: SubcommandContext): Promise<Json> {
  const dataFlag = ctx.flags['--data'] as string | undefined;
  let base: Json = {};

  if (dataFlag) {
    const parsed = await readJsonInput<unknown>(ctx.client, dataFlag, '--data value');

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('--data must be a JSON object of attribute values.');
    }

    base = parsed as Json;
  }

  const data = mergeRecordData(base, parseKeyValues(ctx.flags['--set'] as string[] | undefined));

  if (Object.keys(data).length === 0) {
    throw new Error('Nothing to write. Pass --data <json> or --set key=value.');
  }

  return data;
}

function formatCell(field: Field, value: unknown): string {
  if (field.name === '_createdAt' || field.name === '_updatedAt') {
    return chalk.dim(formatRelativeTime(value as string | null));
  }

  return truncate(formatCellValue(value), 48);
}

function printRecordDetails(client: Client, record: Json, fields: Field[]): void {
  printDetails(
    client,
    fields.map((field) => {
      const label = field.attribute?.label ?? field.name;
      const value = record[field.name];
      const text =
        field.name === '_createdAt' || field.name === '_updatedAt'
          ? `${String(value ?? '')} ${chalk.dim(`(${formatRelativeTime(value as string | null)})`)}`
          : formatCellValue(value);

      return [label, text];
    })
  );
}

const DATA_FLAGS = {
  '--data': String,
  '--set': [String] as [StringConstructor],
  '--scope': String,
};

const ls: Subcommand = {
  command: recordsListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: {
    '--where': String,
    '--fields': String,
    '--limit': Number,
    '--offset': Number,
    '--sort': String,
    '--scope': String,
  },
  async run(ctx) {
    const { schema, entity } = await loadEntity(ctx);
    const scopeFlag = ctx.flags['--scope'] as string | undefined;
    const scope = resolveScope(schema, scopeFlag);
    const fieldsFlag = ctx.flags['--fields'] as string | undefined;
    const fields = fieldsFlag ? parseFields(entity, fieldsFlag) : getDefaultListFields(entity);
    const limit = (ctx.flags['--limit'] as number | undefined) ?? DEFAULT_LIMIT;
    const offset = (ctx.flags['--offset'] as number | undefined) ?? 0;

    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error('--limit must be a positive whole number.');
    }

    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('--offset must be zero or a positive whole number.');
    }

    const sortFlag = ctx.flags['--sort'] as string | undefined;
    const variables = {
      where: (await readWhere(ctx)) ?? {},
      limit,
      offset,
      sort: sortFlag ? parseSort(entity, sortFlag) : DEFAULT_SORT,
    };

    ctx.client.output.spinner(`Loading ${entity.plural}`);
    const data = await runGraphql<{ [plural: string]: Json[] | undefined }>(
      ctx,
      buildListQuery(entity, fields, schema.scopeNames),
      variables
    );
    ctx.client.output.stopSpinner();
    const rawRecords = data[entity.plural] ?? [];

    if (ctx.json) {
      printJson(
        ctx.client,
        rawRecords.map((raw) => normalizeRecord(raw, fields, scopeFlag))
      );

      return 0;
    }

    const records = rawRecords.map((raw) => normalizeRecord(raw, fields, scope));

    printTable(
      ctx.client,
      fields.map((field) => field.name),
      records.map((record) => fields.map((field) => formatCell(field, record[field.name]))),
      offset > 0 ? `No ${entity.plural} at offset ${offset.toString()}.` : `No ${entity.plural} found.`
    );

    if (records.length === limit) {
      ctx.client.output.log(
        chalk.dim(
          `Showing ${records.length.toString()} ${entity.plural}. Next page: --offset ${(offset + limit).toString()}`
        )
      );
    }

    return 0;
  },
};

async function fetchRecord(
  ctx: SubcommandContext,
  entity: RecordEntity,
  fields: Field[],
  schema: RecordSchema,
  id: string
): Promise<Json | null> {
  const data = await runGraphql<{ [plural: string]: Json[] | undefined }>(
    ctx,
    buildListQuery(entity, fields, schema.scopeNames),
    { where: { _id: { eq: id } }, limit: 1 }
  );

  return data[entity.plural]?.[0] ?? null;
}

const get: Subcommand = {
  command: recordsGetCommand,
  aliases: ['inspect'],
  needsProject: true,
  flags: { '--scope': String },
  async run(ctx) {
    const { schema, entity } = await loadEntity(ctx);
    const scopeFlag = ctx.flags['--scope'] as string | undefined;
    const scope = resolveScope(schema, scopeFlag);
    const id = ctx.args[1] as string;
    const fields = getAllFields(entity);

    ctx.client.output.spinner(`Loading ${entity.name} ${id}`);
    const raw = await fetchRecord(ctx, entity, fields, schema, id);
    ctx.client.output.stopSpinner();

    if (!raw) {
      ctx.client.output.error(`No ${entity.name} with id "${id}" (or you cannot read it).`);

      return 1;
    }

    if (ctx.json) {
      printJson(ctx.client, normalizeRecord(raw, fields, scopeFlag));

      return 0;
    }

    printRecordDetails(ctx.client, normalizeRecord(raw, fields, scope), fields);

    return 0;
  },
};

const count: Subcommand = {
  command: recordsCountCommand,
  needsProject: true,
  flags: { '--where': String },
  async run(ctx) {
    const { entity } = await loadEntity(ctx);
    const where = await readWhere(ctx);

    ctx.client.output.spinner(`Counting ${entity.plural}`);
    const data = await runGraphql<{ [field: string]: { totalCount?: number } | undefined }>(
      ctx,
      buildCountQuery(entity),
      { where: where ?? {} }
    );
    ctx.client.output.stopSpinner();
    const total = data[`${entity.plural}Connection`]?.totalCount ?? 0;

    if (ctx.json) {
      printJson(ctx.client, { entity: entity.name, count: total });

      return 0;
    }

    ctx.client.output.print(`${total.toString()}\n`);

    return 0;
  },
};

const create: Subcommand = {
  command: recordsCreateCommand,
  aliases: ['add'],
  needsProject: true,
  flags: DATA_FLAGS,
  async run(ctx) {
    const data = await readRecordData(ctx);
    const { schema, entity } = await loadEntity(ctx);
    const scopeFlag = ctx.flags['--scope'] as string | undefined;
    const scope = resolveScope(schema, scopeFlag);
    const id = typeof data._id === 'string' && data._id ? data._id : randomUUID();
    const input = buildCreateInput(entity, data, schema, scope, id);
    const fields = getAllFields(entity);

    ctx.client.output.spinner(`Creating ${entity.name}`);
    const result = await runGraphql<{ [field: string]: { [plural: string]: Json[] | undefined } | undefined }>(
      ctx,
      buildCreateMutation(entity, fields, schema.scopeNames),
      { input: [input] }
    );
    ctx.client.output.stopSpinner();
    const raw = result[`create${capitalize(entity.plural)}`]?.[entity.plural]?.[0];
    const record = raw ? normalizeRecord(raw, fields, scopeFlag) : { _id: id };

    if (ctx.json) {
      printJson(ctx.client, record);

      return 0;
    }

    ctx.client.output.success(`Created ${entity.name} ${chalk.bold(String(record._id))}`);

    return 0;
  },
};

const update: Subcommand = {
  command: recordsUpdateCommand,
  needsProject: true,
  flags: DATA_FLAGS,
  async run(ctx) {
    const data = await readRecordData(ctx);
    const { schema, entity } = await loadEntity(ctx);
    const scopeFlag = ctx.flags['--scope'] as string | undefined;
    const scope = resolveScope(schema, scopeFlag);
    const id = ctx.args[1] as string;

    // Read the scoped value nodes and linked ids the update has to account for.
    const current = await fetchRecord(ctx, entity, getUpdateReadFields(entity, data), schema, id);

    if (!current) {
      ctx.client.output.stopSpinner();
      ctx.client.output.error(`No ${entity.name} with id "${id}" (or you cannot read it).`);

      return 1;
    }

    const updateInput = buildUpdateInput(entity, data, schema, scope, current);
    const fields = getAllFields(entity);

    ctx.client.output.spinner(`Updating ${entity.name} ${id}`);
    const result = await runGraphql<{ [field: string]: { [plural: string]: Json[] | undefined } | undefined }>(
      ctx,
      buildUpdateMutation(entity, fields, schema.scopeNames),
      { where: { _id: { eq: id } }, update: updateInput }
    );
    ctx.client.output.stopSpinner();
    const raw = result[`update${capitalize(entity.plural)}`]?.[entity.plural]?.[0];

    if (ctx.json) {
      printJson(ctx.client, raw ? normalizeRecord(raw, fields, scopeFlag) : { _id: id });

      return 0;
    }

    ctx.client.output.success(`Updated ${entity.name} ${chalk.bold(id)}`);

    return 0;
  },
};

const rm: Subcommand = {
  command: recordsRemoveCommand,
  aliases: ['remove', 'delete'],
  needsProject: true,
  async run(ctx) {
    const { schema, entity } = await loadEntity(ctx);
    const ids = [...new Set(ctx.args.slice(1))];

    // Only delete what exists and is readable, so the summary is exact.
    const found = await runGraphql<{ [plural: string]: Json[] | undefined }>(
      ctx,
      buildListQuery(entity, getAllFields(entity).slice(0, 1), schema.scopeNames),
      { where: { _id: { in: ids } }, limit: ids.length }
    );
    ctx.client.output.stopSpinner();
    const existing = (found[entity.plural] ?? []).map((record) => String(record._id));
    const missing = ids.filter((id) => !existing.includes(id));

    if (missing.length > 0) {
      ctx.client.output.warn(`Not found: ${missing.join(', ')}`);
    }

    if (existing.length === 0) {
      ctx.client.output.error(`No matching ${entity.plural} to delete.`);

      return 1;
    }

    const label =
      existing.length === 1 ? `${entity.name} ${existing[0] ?? ''}` : `${existing.length.toString()} ${entity.plural}`;

    if (!(await confirmAction(ctx, `Delete ${label}? This cannot be undone.`))) {
      return 1;
    }

    ctx.client.output.spinner(`Deleting ${label}`);
    await runGraphql(ctx, buildDeleteMutation(entity), buildDeleteVariables(entity, existing));
    ctx.client.output.stopSpinner();

    if (ctx.json) {
      printJson(ctx.client, { entity: entity.name, deleted: existing, notFound: missing });

      return 0;
    }

    ctx.client.output.success(`Deleted ${label}`);

    return 0;
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: recordsCommand,
    subcommands: [ls, get, count, create, update, rm],
  });
}
