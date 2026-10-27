import type { Attribute, Entity } from '../../core/types';
import {
  captionOf,
  edgeOf,
  getDisplaySelection,
  getEntity,
  getGraphEntities,
  getRelationshipAttributes,
  nodeKey,
  type GraphData,
  type GraphEdge,
  type GraphNode,
  type GraphRecord,
} from './graph';

/**
 * Pure helpers of the Query view: turning the result of any GraphQL query
 * into nodes and edges, example queries per entity, and the table view.
 */

/** Rows the table view shows at most. */
export const TABLE_ROW_LIMIT = 200;
/** Related records an example query selects per relationship. */
const EXAMPLE_RELATED_LIMIT = 5;
/** Relationships an example query includes. */
const EXAMPLE_RELATIONSHIPS = 3;
const SKIPPED_KEYS = new Set(['_id', '_type', '__typename']);

export type QueryResult = { [field: string]: unknown };

export interface ExampleQuery {
  title: string;
  query: string;
}

export interface QueryTable {
  columns: string[];
  rows: { [column: string]: string }[];
  /** Root records in the result, which may exceed the rows shown. */
  total: number;
}

function isRecord(value: unknown): value is GraphRecord {
  return typeof value === 'object' && value !== null && typeof (value as GraphRecord)._id === 'string';
}

/**
 * The records under a result field: a list, a single object, or a
 * connection (`{ edges: [{ node }] }`).
 */
export function collectRecords(value: unknown): GraphRecord[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectRecords);
  }

  if (typeof value !== 'object' || value === null) {
    return [];
  }

  if (isRecord(value)) {
    return [value];
  }

  const { edges } = value as { edges?: unknown };

  if (Array.isArray(edges)) {
    return edges.flatMap((edge) => collectRecords((edge as { node?: unknown })?.node));
  }

  return [];
}

/** Entity of a root field: its plural, or its plural with a `Connection` suffix. */
export function entityOfRootField(field: string, schema: Entity[]): Entity | undefined {
  const plural = field.endsWith('Connection') ? field.slice(0, -'Connection'.length) : field;

  return schema.find((entity) => entity.plural === plural);
}

/** The relationship attribute a result key selects, with or without the `Connection` suffix. */
function relationshipOfKey(key: string, entity: Entity): Attribute | undefined {
  const name = key.endsWith('Connection') ? key.slice(0, -'Connection'.length) : key;

  return getRelationshipAttributes(entity).find((attribute) => attribute.name === name);
}

/**
 * A caption for a record from whatever the query selected: the display
 * attribute when present, else the first string the record carries.
 */
export function captionFromRecord(record: GraphRecord, entity: Entity | undefined, scope: string): string {
  const caption = captionOf(record, entity, scope);

  if (caption !== record._id) {
    return caption;
  }

  const text = Object.entries(record).find(
    ([key, value]) => !SKIPPED_KEYS.has(key) && typeof value === 'string' && value.trim().length > 0
  );

  return text ? (text[1] as string) : record._id;
}

/**
 * Nodes and edges from a query result: every object with an `_id` under a
 * root field named after an entity becomes a node, every relationship field
 * selected on it an edge to the related nodes. Fields the schema does not
 * know are ignored.
 */
export function graphFromQueryResult({
  data,
  schema,
  scope,
}: {
  data: QueryResult | null | undefined;
  schema: Entity[];
  scope: string;
}): GraphData {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const addRecord = (record: GraphRecord, entity: Entity): GraphNode => {
    const key = nodeKey(entity.name, record._id);
    const existing = nodes.get(key);
    const node: GraphNode = existing ?? {
      key,
      entity: entity.name,
      id: record._id,
      label: captionFromRecord(record, entity, scope),
    };

    if (!existing) {
      nodes.set(key, node);
    }

    Object.entries(record).forEach(([field, value]) => {
      const attribute = relationshipOfKey(field, entity);
      const relatedEntity = attribute ? getEntity(schema, attribute.relationship?.entity ?? '') : undefined;

      if (!attribute || !relatedEntity) {
        return;
      }

      collectRecords(value).forEach((relatedRecord) => {
        const target = addRecord(relatedRecord, relatedEntity);

        if (target.key !== node.key) {
          const edge = edgeOf(node, target, attribute);

          if (!edges.has(edge.key)) {
            edges.set(edge.key, edge);
          }
        }
      });
    });

    return node;
  };

  Object.entries(data ?? {}).forEach(([field, value]) => {
    const entity = entityOfRootField(field, schema);

    if (entity) {
      collectRecords(value).forEach((record) => addRecord(record, entity));
    }
  });

  return { nodes: [...nodes.values()], edges: [...edges.values()], counts: {} };
}

/** One example query per entity with relationships, with a few related records each. */
export function exampleQueries(schema: Entity[], scope: string): ExampleQuery[] {
  return getGraphEntities(schema).map((entity) => {
    const relationships = getRelationshipAttributes(entity)
      .slice(0, EXAMPLE_RELATIONSHIPS)
      .map((attribute) => {
        const related = getEntity(schema, attribute.relationship?.entity ?? '');

        return `    ${attribute.name}(limit: ${EXAMPLE_RELATED_LIMIT}) {\n      _id\n      ${getDisplaySelection(related, scope)}\n    }`;
      });
    const display = getDisplaySelection(entity, scope);

    return {
      title: entity.menu?.label ?? entity.plural,
      query: `query {\n  ${entity.plural}(limit: 25) {\n    _id\n${display ? `    ${display}\n` : ''}${relationships.join('\n')}\n  }\n}`,
    };
  });
}

function formatCell(value: unknown, scope: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    const records = collectRecords(value);

    if (records.length > 0) {
      return `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
    }

    const [first] = value as unknown[];

    if (typeof first === 'object' && first !== null && scope in (first as object)) {
      return formatCell((first as { [key: string]: unknown })[scope], scope);
    }

    return value.map((item) => formatCell(item, scope)).join(', ');
  }

  if (typeof value === 'object') {
    const records = collectRecords(value);

    return records.length > 0
      ? `${records.length} ${records.length === 1 ? 'record' : 'records'}`
      : JSON.stringify(value);
  }

  return String(value);
}

/** The root records of a result as a table: one column per selected field. */
export function tableFromResult(data: QueryResult | null | undefined, scope: string): QueryTable {
  const records = Object.values(data ?? {}).flatMap(collectRecords);
  const columns: string[] = [];
  records.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (key !== '__typename' && !columns.includes(key)) {
        columns.push(key);
      }
    });
  });

  return {
    columns,
    rows: records
      .slice(0, TABLE_ROW_LIMIT)
      .map((record) => Object.fromEntries(columns.map((column) => [column, formatCell(record[column], scope)]))),
    total: records.length,
  };
}

/** Where the last query of a project is remembered. */
export function queryStorageKey(projectId: string): string {
  return `flexkit-graph:query:${projectId}`;
}
