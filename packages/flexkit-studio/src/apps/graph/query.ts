import type { Attribute, Entity } from '../../core/types';
import {
  captionOf,
  edgeOf,
  formatDetailValue,
  getDisplaySelection,
  getEntity,
  getEntityLabel,
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
export type QueryResult = { [field: string]: unknown };

/** What a run of a query produced, for the pane's footer. */
export interface QueryRun {
  data: QueryResult | null;
  error: string | null;
  elapsedMs: number;
  /** Nodes and edges the result maps to; the canvas may hold fewer once at its cap. */
  nodes: number;
  edges: number;
}

export interface ExampleQuery {
  /** Entity name, unique across the schema. */
  entity: string;
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

/** The one relationship of an entity that leads to another, if exactly one does. */
function relationshipTo(entity: Entity, target: string): Attribute | undefined {
  const attributes = getRelationshipAttributes(entity).filter((attribute) => attribute.relationship?.entity === target);

  return attributes.length === 1 ? attributes[0] : undefined;
}

/** The entity of a record: its `__typename` when the API sent one, else the field it came under, if that names one. */
export function entityOfRecord(
  record: GraphRecord,
  fallback: Entity | undefined,
  schema: Entity[]
): Entity | undefined {
  const typename = record.__typename;

  return (typeof typename === 'string' && getEntity(schema, typename)) || fallback;
}

/**
 * A caption for a record from whatever the query selected: the display
 * attribute when present, else the first string the record carries that is
 * not a system field (`_id`, `_createdAt`, `__typename` and the like).
 */
export function captionFromRecord(record: GraphRecord, entity: Entity | undefined, scope: string): string {
  const caption = captionOf(record, entity, scope);

  if (caption !== record._id) {
    return caption;
  }

  const text = Object.entries(record).find(
    ([key, value]) => !key.startsWith('_') && typeof value === 'string' && value.trim().length > 0
  );

  return text ? (text[1] as string) : record._id;
}

/**
 * Nodes and edges from a query result: every object with an `_id` whose
 * `__typename` names an entity becomes a node, as does one under a root
 * field named after an entity's plural when the typename is missing; every
 * relationship field selected on it, aliased or not, is an edge to the
 * related nodes. A
 * record seen again with a better caption is re-captioned. Fields the schema
 * does not know are ignored.
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

  const addRecord = (record: GraphRecord, fallback: Entity | undefined): GraphNode | null => {
    const entity = entityOfRecord(record, fallback, schema);

    if (!entity) {
      return null;
    }

    const key = nodeKey(entity.name, record._id);
    const label = captionFromRecord(record, entity, scope);
    const existing = nodes.get(key);
    const node: GraphNode = existing ?? { key, entity: entity.name, id: record._id, label };

    if (!existing) {
      nodes.set(key, node);
    } else if (existing.label === existing.id && label !== record._id) {
      existing.label = label;
    }

    Object.entries(record).forEach(([field, value]) => {
      const keyAttribute = relationshipOfKey(field, entity);
      const keyEntity = keyAttribute ? getEntity(schema, keyAttribute.relationship?.entity ?? '') : undefined;

      collectRecords(value).forEach((relatedRecord) => {
        // An aliased relationship (`maker: brand { … }`) is not named by its
        // key: the record's typename finds the entity, and the attribute when
        // only one relationship leads there.
        const target = addRecord(relatedRecord, keyEntity);
        const attribute = keyAttribute ?? (target ? relationshipTo(entity, target.entity) : undefined);

        if (target && attribute && target.key !== node.key) {
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
    const fallback = entityOfRootField(field, schema);
    collectRecords(value).forEach((record) => addRecord(record, fallback));
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
      entity: entity.name,
      title: getEntityLabel(entity),
      query: `query {\n  ${entity.plural}(limit: 25) {\n    _id\n${display ? `    ${display}\n` : ''}${relationships.join('\n')}\n  }\n}`,
    };
  });
}

/** A table cell: related records as a count, scoped values through the inspector's formatter. */
function formatCell(value: unknown, scope: string): string {
  const records = collectRecords(value);

  if (records.length > 0) {
    return `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
  }

  if (Array.isArray(value) && !(typeof value[0] === 'object' && value[0] !== null)) {
    return value.map((item) => formatDetailValue(item, scope)).join(', ');
  }

  return formatDetailValue(value, scope);
}

/**
 * The objects under a root field, with or without an `_id`: a list, a single
 * object, or the nodes of a connection's edges.
 */
function collectRows(value: unknown): GraphRecord[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectRows);
  }

  if (typeof value !== 'object' || value === null) {
    return [];
  }

  const { edges } = value as { edges?: unknown };

  if (!isRecord(value) && Array.isArray(edges)) {
    return edges.flatMap((edge) => collectRows((edge as { node?: unknown })?.node));
  }

  return [value as GraphRecord];
}

/** The root objects of a result as a table: one column per field the shown rows select. */
export function tableFromResult(data: QueryResult | null | undefined, scope: string): QueryTable {
  const records = Object.values(data ?? {}).flatMap(collectRows);
  const shown = records.slice(0, TABLE_ROW_LIMIT);
  const columns: string[] = [];
  shown.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (key !== '__typename' && !columns.includes(key)) {
        columns.push(key);
      }
    });
  });

  return {
    columns,
    rows: shown.map((record) =>
      Object.fromEntries(columns.map((column) => [column, formatCell(record[column], scope)]))
    ),
    total: records.length,
  };
}

/** The response without the `__typename` keys the client adds, for the JSON view. */
export function stripTypename(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripTypename);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as { [key: string]: unknown })
        .filter(([key]) => key !== '__typename')
        .map(([key, item]) => [key, stripTypename(item)])
    );
  }

  return value;
}

/** Where the last query of a project is remembered. */
export function queryStorageKey(projectId: string): string {
  return `flexkit-graph:query:${projectId}`;
}
