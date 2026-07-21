import { formatGraphQLErrors, graphqlRequest } from '../graphql';
import { capitalize } from './schema';
import type Client from '../client';
import type { EntitySchema } from './schema';
import type { ParsedEntity } from './parse';

export type CreateBatchResult = {
  created: number;
  errorMessage?: string;
};

function connectByIdEq(assetId: string): { where: { node: { _id: { eq: string } } } } {
  return { where: { node: { _id: { eq: assetId } } } };
}

/**
 * Builds the (variables-based) create input object for one parsed entity.
 * Entity-to-entity refs are excluded; they are connected in a second pass
 * after every entity exists.
 */
export function buildCreateInput(
  parsed: ParsedEntity,
  assetIdByRef: Map<string, string>
): { [key: string]: unknown } {
  const input: { [key: string]: unknown } = { _id: parsed._id, ...parsed.globals };

  for (const local of parsed.locals) {
    input[local.name] = {
      create: [
        {
          node: {
            _id: `${parsed._id}:${local.name}`,
            _type: local.dataType,
            ...local.values,
          },
        },
      ],
    };
  }

  for (const assetSingle of parsed.assetSingles) {
    const assetId = assetIdByRef.get(assetSingle.ref);

    if (!assetId) {
      continue;
    }

    input[assetSingle.name] = { connect: [connectByIdEq(assetId)] };
  }

  for (const assetMultiple of parsed.assetMultiples) {
    const connects = assetMultiple.refs
      .map((ref, index) => {
        const assetId = assetIdByRef.get(ref);

        if (!assetId) {
          return null;
        }

        return { ...connectByIdEq(assetId), edge: { sortOrder: index } };
      })
      .filter((connect): connect is NonNullable<typeof connect> => connect !== null);

    if (connects.length > 0) {
      input[assetMultiple.name] = { connect: connects };
    }
  }

  return input;
}

export function buildCreateMutation(entity: EntitySchema): string {
  const operationName = `Import${capitalize(entity.plural)}`;

  return (
    `mutation ${operationName}($input: [${entity.name}CreateInput!]!) {\n` +
    `  create${capitalize(entity.plural)}(input: $input) {\n` +
    `    ${entity.plural} {\n` +
    `      _id\n` +
    `    }\n` +
    `  }\n` +
    `}`
  );
}

export function buildUpdateMutation(entity: EntitySchema): string {
  const operationName = `ImportUpdate${capitalize(entity.plural)}`;

  return (
    `mutation ${operationName}($where: ${entity.name}Where, $update: ${entity.name}UpdateInput) {\n` +
    `  update${capitalize(entity.plural)}(where: $where, update: $update) {\n` +
    `    ${entity.plural} {\n` +
    `      _id\n` +
    `    }\n` +
    `  }\n` +
    `}`
  );
}

export async function createEntityBatch(
  client: Client,
  projectId: string,
  entity: EntitySchema,
  inputs: { [key: string]: unknown }[]
): Promise<CreateBatchResult> {
  const response = await graphqlRequest<{
    [key: string]: { [plural: string]: { _id: string }[] } | undefined;
  }>(client, projectId, buildCreateMutation(entity), { input: inputs });

  if (response.errors?.length) {
    return { created: 0, errorMessage: formatGraphQLErrors(response.errors) };
  }

  const mutationField = response.data?.[`create${capitalize(entity.plural)}`];
  const created = mutationField?.[entity.plural]?.length ?? 0;

  return { created };
}

export async function updateEntity(
  client: Client,
  projectId: string,
  entity: EntitySchema,
  entityId: string,
  update: { [key: string]: unknown }
): Promise<{ errorMessage?: string }> {
  const response = await graphqlRequest(client, projectId, buildUpdateMutation(entity), {
    where: { _id: { eq: entityId } },
    update,
  });

  if (response.errors?.length) {
    return { errorMessage: formatGraphQLErrors(response.errors) };
  }

  return {};
}

/**
 * Returns the subset of ids that already exist for the entity.
 */
export async function findExistingEntityIds(
  client: Client,
  projectId: string,
  entity: EntitySchema,
  ids: string[]
): Promise<Set<string>> {
  const existing = new Set<string>();
  const batchSize = 100;

  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const batch = ids.slice(offset, offset + batchSize);
    const response = await graphqlRequest<{ [plural: string]: { _id: string }[] | undefined }>(
      client,
      projectId,
      `query Existing${capitalize(entity.plural)}($where: ${entity.name}Where) {\n  ${entity.plural}(where: $where) {\n    _id\n  }\n}`,
      { where: { _id: { in: batch } } }
    );

    if (response.errors?.length) {
      throw new Error(`Failed to query existing ${entity.plural}: ${formatGraphQLErrors(response.errors)}`);
    }

    for (const item of response.data?.[entity.plural] ?? []) {
      existing.add(item._id);
    }
  }

  return existing;
}

type ExistingConnections = {
  [attributeName: string]: string[];
};

/**
 * Fetches the currently connected node ids for the given relationship/asset
 * attributes of existing entities. Used by --replace to build precise
 * disconnects.
 */
export async function fetchExistingConnections(
  client: Client,
  projectId: string,
  entity: EntitySchema,
  ids: string[],
  attributeNames: string[]
): Promise<Map<string, ExistingConnections>> {
  const connections = new Map<string, ExistingConnections>();

  if (ids.length === 0 || attributeNames.length === 0) {
    return connections;
  }

  const selection = attributeNames.map((name) => `    ${name}(limit: 1000) {\n      _id\n    }`).join('\n');
  const batchSize = 50;

  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const batch = ids.slice(offset, offset + batchSize);
    const response = await graphqlRequest<{
      [plural: string]: ({ _id: string } & { [attribute: string]: { _id: string }[] | string })[] | undefined;
    }>(
      client,
      projectId,
      `query Connections${capitalize(entity.plural)}($where: ${entity.name}Where) {\n  ${entity.plural}(where: $where) {\n    _id\n${selection}\n  }\n}`,
      { where: { _id: { in: batch } } }
    );

    if (response.errors?.length) {
      throw new Error(`Failed to query connections for ${entity.plural}: ${formatGraphQLErrors(response.errors)}`);
    }

    for (const item of response.data?.[entity.plural] ?? []) {
      const entry: ExistingConnections = {};

      for (const name of attributeNames) {
        const value = item[name];

        entry[name] = Array.isArray(value) ? value.map((node) => node._id) : [];
      }

      connections.set(item._id, entry);
    }
  }

  return connections;
}

/**
 * Builds the update input for --replace: scalars are set, asset and ref
 * connections are diffed against the current state (disconnect removed ids,
 * connect new ones).
 */
export function buildReplaceUpdate(
  parsed: ParsedEntity,
  assetIdByRef: Map<string, string>,
  existingConnections: ExistingConnections
): { [key: string]: unknown } {
  const update: { [key: string]: unknown } = {};

  for (const [name, value] of Object.entries(parsed.globals)) {
    update[name] = { set: value };
  }

  for (const local of parsed.locals) {
    const node: { [scope: string]: { set: unknown } } = {};

    for (const [scope, value] of Object.entries(local.values)) {
      node[scope] = { set: value };
    }

    update[local.name] = [{ update: { node } }];
  }

  for (const assetSingle of parsed.assetSingles) {
    const assetId = assetIdByRef.get(assetSingle.ref);

    if (!assetId) {
      continue;
    }

    const current = existingConnections[assetSingle.name] ?? [];
    const disconnectIds = current.filter((id) => id !== assetId);
    const shouldConnect = !current.includes(assetId);
    const operations: { [key: string]: unknown }[] = [];

    if (disconnectIds.length > 0) {
      operations.push({ disconnect: disconnectIds.map((id) => connectByIdEq(id)) });
    }

    if (shouldConnect) {
      operations.push({ connect: [connectByIdEq(assetId)] });
    }

    if (operations.length > 0) {
      update[assetSingle.name] = operations;
    }
  }

  for (const assetMultiple of parsed.assetMultiples) {
    const desiredIds = assetMultiple.refs
      .map((ref) => assetIdByRef.get(ref))
      .filter((id): id is string => Boolean(id));
    const current = existingConnections[assetMultiple.name] ?? [];
    const disconnectIds = current.filter((id) => !desiredIds.includes(id));
    const connects = desiredIds
      .map((id, index) => ({ id, sortOrder: index }))
      .filter(({ id }) => !current.includes(id));
    const operations: { [key: string]: unknown }[] = [];

    if (disconnectIds.length > 0) {
      operations.push({ disconnect: disconnectIds.map((id) => connectByIdEq(id)) });
    }

    if (connects.length > 0) {
      operations.push({
        connect: connects.map(({ id, sortOrder }) => ({ ...connectByIdEq(id), edge: { sortOrder } })),
      });
    }

    if (operations.length > 0) {
      update[assetMultiple.name] = operations;
    }
  }

  return update;
}

/**
 * Builds the second-pass update connecting entity-to-entity refs. For
 * --replace entities the connections are diffed against the current state.
 */
export function buildRefConnectUpdate(
  parsed: ParsedEntity,
  existingConnections: ExistingConnections | undefined
): { [key: string]: unknown } | null {
  const update: { [key: string]: unknown } = {};

  for (const refSingle of parsed.refSingles) {
    const current = existingConnections?.[refSingle.name] ?? [];

    if (current.includes(refSingle.refId) && current.length === 1) {
      continue;
    }

    const operations: { [key: string]: unknown }[] = [];
    const disconnectIds = current.filter((id) => id !== refSingle.refId);

    if (disconnectIds.length > 0) {
      operations.push({ disconnect: disconnectIds.map((id) => connectByIdEq(id)) });
    }

    if (!current.includes(refSingle.refId)) {
      operations.push({ connect: [connectByIdEq(refSingle.refId)] });
    }

    if (operations.length > 0) {
      update[refSingle.name] = operations;
    }
  }

  for (const refMultiple of parsed.refMultiples) {
    const current = existingConnections?.[refMultiple.name] ?? [];
    const disconnectIds = current.filter((id) => !refMultiple.refIds.includes(id));
    const connectIds = refMultiple.refIds.filter((id) => !current.includes(id));
    const operation: { [key: string]: unknown } = {};

    if (disconnectIds.length > 0) {
      operation.disconnect = {
        where: { OR: disconnectIds.map((id) => ({ node: { _id: { eq: id } } })) },
      };
    }

    if (connectIds.length > 0) {
      operation.connect = { where: { node: { _id: { in: connectIds } } } };
    }

    if (Object.keys(operation).length > 0) {
      update[refMultiple.name] = operation;
    }
  }

  return Object.keys(update).length > 0 ? update : null;
}
