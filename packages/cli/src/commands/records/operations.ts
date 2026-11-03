import { capitalize } from '../../util/import/schema';
import {
  classifyAttribute,
  getDisplayAttribute,
  isScalarKind,
  SYSTEM_FIELDS,
  type AttributeKind,
  type RecordAttribute,
  type RecordEntity,
  type RecordSchema,
} from './schema';

/** Records a relationship field returns at most; matches the Studio's nested limit. */
export const RELATIONSHIP_LIMIT = 100;

type Json = { [key: string]: unknown };

export interface Field {
  name: string;
  kind: AttributeKind | 'system';
  attribute?: RecordAttribute;
}

const SYSTEM_FIELD_NAMES: readonly string[] = SYSTEM_FIELDS;

function isPlainObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toField(attribute: RecordAttribute): Field {
  return { name: attribute.name, kind: classifyAttribute(attribute), attribute };
}

function systemField(name: string): Field {
  return { name, kind: 'system' };
}

/** Every field of a record: `_id`, each attribute, then the timestamps. */
export function getAllFields(entity: RecordEntity): Field[] {
  return [systemField('_id'), ...entity.attributes.map(toField), systemField('_createdAt'), systemField('_updatedAt')];
}

/**
 * The columns `records ls` shows when `--fields` is not given: `_id`, the
 * display attribute, up to three more visible scalar attributes, and the last
 * update time.
 */
export function getDefaultListFields(entity: RecordEntity, maxAttributes = 4): Field[] {
  const display = getDisplayAttribute(entity);
  const attributes = entity.attributes.filter(
    (attribute) => !attribute.hidden && isScalarKind(classifyAttribute(attribute))
  );
  const ordered = display ? [display, ...attributes.filter((attribute) => attribute !== display)] : attributes;

  return [systemField('_id'), ...ordered.slice(0, maxAttributes).map(toField), systemField('_updatedAt')];
}

/** Parses `--fields a,b,c`; `_id` is always included first. */
export function parseFields(entity: RecordEntity, value: string): Field[] {
  const names = value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  const fields: Field[] = [systemField('_id')];

  for (const name of names) {
    if (fields.some((field) => field.name === name)) {
      continue;
    }

    if (SYSTEM_FIELD_NAMES.includes(name)) {
      fields.push(systemField(name));
      continue;
    }

    const attribute = entity.attributes.find((item) => item.name === name);

    if (!attribute) {
      throw new Error(
        `Unknown field "${name}" on ${entity.name}. Available fields: ${getAllFields(entity)
          .map((field) => field.name)
          .join(', ')}.`
      );
    }

    fields.push(toField(attribute));
  }

  return fields;
}

/** Parses `--sort price:desc,_createdAt` into the GraphQL `sort` argument. */
export function parseSort(entity: RecordEntity, value: string): { [field: string]: 'ASC' | 'DESC' }[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name = '', direction = 'asc'] = part.split(':');
      const normalizedDirection = direction.toLowerCase();

      if (normalizedDirection !== 'asc' && normalizedDirection !== 'desc') {
        throw new Error(`Invalid sort direction "${direction}" in "${part}". Use asc or desc.`);
      }

      const attribute = entity.attributes.find((item) => item.name === name);
      const sortable =
        SYSTEM_FIELD_NAMES.includes(name) || (attribute !== undefined && classifyAttribute(attribute) === 'global');

      if (!sortable) {
        throw new Error(
          attribute
            ? `Cannot sort by "${name}": only global attributes and _id, _createdAt, _updatedAt are sortable.`
            : `Unknown sort field "${name}" on ${entity.name}.`
        );
      }

      return { [name]: normalizedDirection === 'desc' ? 'DESC' : 'ASC' } as { [field: string]: 'ASC' | 'DESC' };
    });
}

/** The GraphQL selection of one field, indented for the record body. */
export function buildFieldSelection(field: Field, scopeNames: string[]): string {
  switch (field.kind) {
    case 'system':
    case 'global':
      return field.name;
    case 'local':
      return `${field.name} { _id ${scopeNames.join(' ')} }`;
    case 'asset-single':
      return `${field.name} { _id url }`;
    case 'asset-multiple':
      return `${field.name}Connection { edges { properties { sortOrder } node { _id url } } }`;
    case 'ref-single':
      return `${field.name}(limit: 1) { _id }`;
    case 'ref-multiple':
      return `${field.name}(limit: ${RELATIONSHIP_LIMIT}) { _id }`;
  }
}

function buildSelectionSet(fields: Field[], scopeNames: string[], indent: string): string {
  return fields.map((field) => `${indent}${buildFieldSelection(field, scopeNames)}`).join('\n');
}

function operationName(prefix: string, entity: RecordEntity): string {
  return `${prefix}${capitalize(entity.plural).replace(/[^A-Za-z0-9_]/g, '')}`;
}

/** Query for `records ls` and `records get`: variables `where`, `limit`, `offset`, `sort`. */
export function buildListQuery(entity: RecordEntity, fields: Field[], scopeNames: string[]): string {
  return (
    `query ${operationName('List', entity)}($where: ${entity.name}Where, $limit: Int, $offset: Int, $sort: [${entity.name}Sort!]) {\n` +
    `  ${entity.plural}(where: $where, limit: $limit, offset: $offset, sort: $sort) {\n` +
    `${buildSelectionSet(fields, scopeNames, '    ')}\n` +
    `  }\n` +
    `}`
  );
}

/** Query for `records count`: `<plural>Connection(where) { totalCount }`. */
export function buildCountQuery(entity: RecordEntity): string {
  return (
    `query ${operationName('Count', entity)}($where: ${entity.name}Where) {\n` +
    `  ${entity.plural}Connection(where: $where) {\n` +
    `    totalCount\n` +
    `  }\n` +
    `}`
  );
}

export function buildCreateMutation(entity: RecordEntity, fields: Field[], scopeNames: string[]): string {
  return (
    `mutation ${operationName('Create', entity)}($input: [${entity.name}CreateInput!]!) {\n` +
    `  create${capitalize(entity.plural)}(input: $input) {\n` +
    `    ${entity.plural} {\n` +
    `${buildSelectionSet(fields, scopeNames, '      ')}\n` +
    `    }\n` +
    `  }\n` +
    `}`
  );
}

export function buildUpdateMutation(entity: RecordEntity, fields: Field[], scopeNames: string[]): string {
  return (
    `mutation ${operationName('Update', entity)}($where: ${entity.name}Where, $update: ${entity.name}UpdateInput) {\n` +
    `  update${capitalize(entity.plural)}(where: $where, update: $update) {\n` +
    `    ${entity.plural} {\n` +
    `${buildSelectionSet(fields, scopeNames, '      ')}\n` +
    `    }\n` +
    `  }\n` +
    `}`
  );
}

function getLocalAttributes(entity: RecordEntity): RecordAttribute[] {
  return entity.attributes.filter((attribute) => classifyAttribute(attribute) === 'local');
}

/** Deletes records and their locally scoped value nodes, as the Studio does. */
export function buildDeleteMutation(entity: RecordEntity): string {
  const hasLocal = getLocalAttributes(entity).length > 0;

  return (
    `mutation ${operationName('Delete', entity)}($where: ${entity.name}Where${hasLocal ? `, $delete: ${entity.name}DeleteInput` : ''}) {\n` +
    `  delete${capitalize(entity.plural)}(where: $where${hasLocal ? ', delete: $delete' : ''}) {\n` +
    `    nodesDeleted\n` +
    `    relationshipsDeleted\n` +
    `  }\n` +
    `}`
  );
}

export function buildDeleteVariables(entity: RecordEntity, ids: string[]): Json {
  const variables: Json = { where: { _id: { in: ids } } };
  const local = getLocalAttributes(entity);

  if (local.length > 0) {
    variables.delete = Object.fromEntries(
      local.map((attribute) => [
        attribute.name,
        [{ where: { node: { _id: { in: ids.map((id) => `${id}:${attribute.name}`) } } } }],
      ])
    );
  }

  return variables;
}

function firstItem(value: unknown): Json | null {
  if (Array.isArray(value)) {
    return isPlainObject(value[0]) ? value[0] : null;
  }

  return isPlainObject(value) ? value : null;
}

function getConnectionNodes(value: unknown): Json[] {
  const edges = isPlainObject(value) && Array.isArray(value.edges) ? (value.edges as Json[]) : [];

  return edges
    .map((edge, index) => {
      const properties = isPlainObject(edge.properties) ? edge.properties : {};
      const sortOrder = typeof properties.sortOrder === 'number' ? properties.sortOrder : index;

      return { node: isPlainObject(edge.node) ? edge.node : null, sortOrder };
    })
    .filter((edge): edge is { node: Json; sortOrder: number } => edge.node !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((edge) => edge.node);
}

/**
 * Turns a GraphQL record into plain values: local attributes become
 * `{ scope: value }` (or the one scope's value when `scope` is given),
 * relationships become ids, assets `{ _id, url }`.
 */
export function normalizeRecord(raw: Json, fields: Field[], scope?: string): Json {
  const record: Json = {};

  for (const field of fields) {
    switch (field.kind) {
      case 'system':
      case 'global':
        record[field.name] = raw[field.name] ?? null;
        break;
      case 'local': {
        const node = firstItem(raw[field.name]);

        if (scope) {
          record[field.name] = node?.[scope] ?? null;
        } else {
          record[field.name] = node ? Object.fromEntries(Object.entries(node).filter(([key]) => key !== '_id')) : null;
        }
        break;
      }
      case 'asset-single':
        record[field.name] = firstItem(raw[field.name]);
        break;
      case 'asset-multiple':
        record[field.name] = getConnectionNodes(raw[`${field.name}Connection`]);
        break;
      case 'ref-single':
        record[field.name] = (firstItem(raw[field.name])?._id as string | undefined) ?? null;
        break;
      case 'ref-multiple':
        record[field.name] = Array.isArray(raw[field.name]) ? (raw[field.name] as Json[]).map((item) => item._id) : [];
        break;
    }
  }

  return record;
}

/** The ids currently linked through a relationship or asset field of a raw record. */
function getLinkedIds(raw: Json, field: Field): string[] {
  const nodes =
    field.kind === 'asset-multiple'
      ? getConnectionNodes(raw[`${field.name}Connection`])
      : Array.isArray(raw[field.name])
        ? (raw[field.name] as Json[])
        : [];

  return nodes.map((node) => node._id).filter((id): id is string => typeof id === 'string');
}

const STRING_TYPES = new Set(['string', 'id', 'select', 'date', 'datetime', 'time', 'duration', 'bigint']);
const NUMBER_TYPES = new Set(['int', 'float']);

/** `--set code=123` parses as a number; a string attribute still needs a string. */
export function coerceScalar(dataType: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (STRING_TYPES.has(dataType) && (typeof value === 'number' || typeof value === 'boolean')) {
    return String(value);
  }

  if (NUMBER_TYPES.has(dataType) && typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  if (dataType === 'boolean' && (value === 'true' || value === 'false')) {
    return value === 'true';
  }

  return value;
}

/** A local value is either `{ scope: value }` with known scope keys or one value for `scope`. */
function toScopedValues(value: unknown, attribute: RecordAttribute, schema: RecordSchema, scope: string): Json {
  if (
    isPlainObject(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((key) => schema.scopeNames.includes(key))
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, coerceScalar(attribute.dataType, item)])
    );
  }

  if (isPlainObject(value)) {
    throw new Error(
      `"${attribute.name}" is a scoped attribute; pass a value or an object keyed by scope (${schema.scopeNames.join(', ')}).`
    );
  }

  return { [scope]: coerceScalar(attribute.dataType, value) };
}

/** Accepts an id, a list of ids, or objects with `_id` (as `records get --json` prints them). */
export function toIdList(value: unknown, attributeName: string): string[] {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  const items = Array.isArray(value) ? value : [value];

  return items.map((item) => {
    if (typeof item === 'string' && item) {
      return item;
    }

    if (isPlainObject(item) && typeof item._id === 'string') {
      return item._id;
    }

    throw new Error(`"${attributeName}" links other records; pass a record id or a list of ids.`);
  });
}

function connectWhere(ids: string[]): Json {
  return { where: { node: { _id: { in: ids } } } };
}

/** Checks every key against the entity and returns the matching fields. */
function resolveDataFields(entity: RecordEntity, data: Json, allowId: boolean): [Field, unknown][] {
  const entries: [Field, unknown][] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === '_id' && allowId) {
      continue;
    }

    if (SYSTEM_FIELD_NAMES.includes(key)) {
      throw new Error(`"${key}" is set by Flexkit and cannot be written.`);
    }

    const attribute = entity.attributes.find((item) => item.name === key);

    if (!attribute) {
      throw new Error(
        `Unknown attribute "${key}" on ${entity.name}. Attributes: ${entity.attributes
          .map((item) => item.name)
          .join(', ')}.`
      );
    }

    entries.push([toField(attribute), value]);
  }

  return entries;
}

function checkSingle(field: Field, ids: string[]): void {
  if ((field.kind === 'ref-single' || field.kind === 'asset-single') && ids.length > 1) {
    throw new Error(`"${field.name}" links a single record; got ${ids.length.toString()} ids.`);
  }
}

/** The `input` item of `create<Plural>` for plain record data. */
export function buildCreateInput(
  entity: RecordEntity,
  data: Json,
  schema: RecordSchema,
  scope: string,
  id: string
): Json {
  const input: Json = { _id: id };

  for (const [field, value] of resolveDataFields(entity, data, true)) {
    const attribute = field.attribute as RecordAttribute;

    switch (field.kind) {
      case 'global':
        if (value !== null && value !== undefined) {
          input[field.name] = coerceScalar(attribute.dataType, value);
        }
        break;
      case 'local': {
        const scoped = Object.fromEntries(
          Object.entries(toScopedValues(value, attribute, schema, scope)).filter(
            ([, item]) => item !== null && item !== undefined
          )
        );

        if (Object.keys(scoped).length > 0) {
          input[field.name] = {
            create: [{ node: { _id: `${id}:${field.name}`, _type: attribute.dataType, ...scoped } }],
          };
        }
        break;
      }
      case 'asset-multiple': {
        const ids = toIdList(value, field.name);

        if (ids.length > 0) {
          input[field.name] = {
            connect: ids.map((assetId, index) => ({
              where: { node: { _id: { eq: assetId } } },
              edge: { sortOrder: index },
            })),
          };
        }
        break;
      }
      default: {
        const ids = toIdList(value, field.name);

        checkSingle(field, ids);

        if (ids.length > 0) {
          input[field.name] = { connect: [connectWhere(ids)] };
        }
      }
    }
  }

  return input;
}

/** The fields `records update` reads before writing: scoped node ids and linked ids. */
export function getUpdateReadFields(entity: RecordEntity, data: Json): Field[] {
  return [systemField('_id'), ...resolveDataFields(entity, data, false).map(([field]) => field)];
}

/**
 * The `update` argument of `update<Plural>`. `current` is the raw record read
 * with `getUpdateReadFields`: an existing scoped node is updated, a missing one
 * created; relationship fields are replaced by the given ids.
 */
export function buildUpdateInput(
  entity: RecordEntity,
  data: Json,
  schema: RecordSchema,
  scope: string,
  current: Json
): Json {
  const update: Json = {};
  const id = String(current._id);

  if ('_id' in data && data._id !== current._id) {
    throw new Error('The _id of a record cannot be changed.');
  }

  for (const [field, value] of resolveDataFields(entity, data, true)) {
    const attribute = field.attribute as RecordAttribute;

    switch (field.kind) {
      case 'global':
        update[field.name] = { set: coerceScalar(attribute.dataType, value ?? null) };
        break;
      case 'local': {
        const scoped = toScopedValues(value ?? null, attribute, schema, scope);
        const existing = firstItem(current[field.name]);

        if (existing?._id) {
          update[field.name] = [
            {
              update: {
                node: Object.fromEntries(Object.entries(scoped).map(([key, item]) => [key, { set: item ?? null }])),
              },
            },
          ];
        } else {
          const values = Object.fromEntries(
            Object.entries(scoped).filter(([, item]) => item !== null && item !== undefined)
          );

          if (Object.keys(values).length > 0) {
            update[field.name] = [
              { create: { node: { _id: `${id}:${field.name}`, _type: attribute.dataType, ...values } } },
            ];
          }
        }
        break;
      }
      default: {
        const ids = toIdList(value, field.name);

        checkSingle(field, ids);

        const linked = getLinkedIds(current, field);

        // Only the first RELATIONSHIP_LIMIT links are read, so a diff against them would be wrong.
        if (field.kind === 'ref-multiple' && linked.length >= RELATIONSHIP_LIMIT) {
          throw new Error(
            `${field.name} has ${String(RELATIONSHIP_LIMIT)} or more links, too many to replace safely. Use \`flexkit query\` with a mutation that connects or disconnects the links you mean.`
          );
        }

        const removed = linked.filter((item) => !ids.includes(item));
        const added = ids.filter((item) => !linked.includes(item));
        const operations: Json[] = [];

        if (removed.length > 0) {
          operations.push({ disconnect: [connectWhere(removed)] });
        }

        if (field.kind === 'asset-multiple') {
          ids.forEach((assetId, index) => {
            if (linked.includes(assetId)) {
              operations.push({
                update: { where: { node: { _id: { eq: assetId } } }, edge: { sortOrder: { set: index } } },
              });
            }
          });

          const connects = ids
            .map((assetId, index) => ({ assetId, index }))
            .filter(({ assetId }) => added.includes(assetId))
            .map(({ assetId, index }) => ({ where: { node: { _id: { eq: assetId } } }, edge: { sortOrder: index } }));

          if (connects.length > 0) {
            operations.push({ connect: connects });
          }
        } else if (added.length > 0) {
          operations.push({ connect: [connectWhere(added)] });
        }

        if (operations.length > 0) {
          update[field.name] = operations;
        }
      }
    }
  }

  return update;
}

/** The text of a rich text document, one paragraph per line. */
export function richTextToPlainText(node: unknown): string {
  if (!isPlainObject(node)) {
    return '';
  }

  if (typeof node.text === 'string') {
    return node.text;
  }

  const children = Array.isArray(node.content) ? node.content.map((child) => richTextToPlainText(child)) : [];
  const blockTypes = new Set(['doc', 'bulletList', 'orderedList', 'table', 'tableRow']);

  return blockTypes.has(String(node.type)) ? children.filter(Boolean).join('\n') : children.join('');
}

/** Shows a normalized value in one table cell. */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    // Rich text attributes are stored as a serialized ProseMirror document.
    if (value.startsWith('{"type":"doc"')) {
      try {
        return richTextToPlainText(JSON.parse(value));
      } catch {
        return value;
      }
    }

    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatCellValue(item)).join(', ');
  }

  if (isPlainObject(value)) {
    // Rich text (a ProseMirror document): show its text.
    if (value.type === 'doc' && Array.isArray(value.content)) {
      return richTextToPlainText(value);
    }

    if (typeof value._id === 'string') {
      return typeof value.url === 'string' && value.url ? value.url : value._id;
    }

    return Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .map(([key, item]) => `${key}: ${formatCellValue(item)}`)
      .join(', ');
  }

  return JSON.stringify(value);
}

/** Merges `--data` with `--set` values; `--set name.de=…` keeps the other scopes of `--data`. */
export function mergeRecordData(base: Json, overrides: Json): Json {
  const merged: Json = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    const existing = merged[key];

    merged[key] = isPlainObject(existing) && isPlainObject(value) ? { ...existing, ...value } : value;
  }

  return merged;
}
