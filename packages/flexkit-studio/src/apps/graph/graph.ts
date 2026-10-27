import { find, propEq } from 'ramda';
import { getAttributeScope } from '../../core/attribute-scope';
import { getDisplayAttribute } from '../../core/get-display-attribute';
import type { Attribute, Entity } from '../../core/types';

/**
 * Pure helpers of the Graph app: the GraphQL queries that fetch records with
 * their relationships, and the mapping of their results to the nodes and
 * edges the canvas draws. No React, no sigma, so the rules are unit-testable.
 */

/** Related records fetched per relationship attribute in one go. */
export const EXPAND_PAGE = 25;
/** Records loaded when starting from an entity. */
export const SAMPLE_LIMIT = 25;
/** Nodes a canvas holds at most; later additions are dropped with a notice. */
export const MAX_NODES = 2000;
/** Attributes shown in the inspector at most. */
export const DETAIL_ATTRIBUTE_LIMIT = 12;

/** Entities whose nodes are never drawn: assets are media, not records. */
const HIDDEN_ENTITIES = new Set(['_asset']);

/**
 * Categorical palette, one hue per entity in schema order (light and dark
 * surfaces step the same hues). The first eight are the validated dataviz
 * palette; the next four were checked with its script so adjacent pairs
 * stay apart under colour-blindness simulation and no pair on either
 * surface comes closer than the reference palette's own closest pair.
 * Projects with more entities than hues reuse them.
 */
export const GRAPH_PALETTE = {
  light: [
    '#2a78d6',
    '#eb6834',
    '#1baf7a',
    '#eda100',
    '#e87ba4',
    '#008300',
    '#6250d6',
    '#e34948',
    '#0e9aa7',
    '#6b8e23',
    '#9c27b0',
    '#a05a2c',
  ],
  dark: [
    '#3987e5',
    '#d95926',
    '#199e70',
    '#c98500',
    '#d55181',
    '#008300',
    '#9085e9',
    '#e66767',
    '#1a9fb0',
    '#6f8a28',
    '#c058d6',
    '#a35226',
  ],
} as const;

export interface GraphNode {
  key: string;
  entity: string;
  id: string;
  label: string;
}

export interface GraphEdge {
  key: string;
  source: string;
  target: string;
  /** The relationship attribute on the source node's entity. */
  sourceAttribute: string;
  /** The mirror attribute on the target node's entity. */
  targetAttribute: string;
}

/** Related records per relationship attribute, keyed by node, as the API counted them. */
export type GraphCounts = { [nodeKey: string]: { [attribute: string]: number } };

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  counts: GraphCounts;
}

export type GraphRecord = { _id: string; [key: string]: unknown };

type ConnectionCount = { aggregate?: { count?: { nodes?: number } } };

export function nodeKey(entity: string, id: string): string {
  return `${entity}:${id}`;
}

/** Relationship attributes of an entity that point at drawable entities. */
export function getRelationshipAttributes(entity: Entity): Attribute[] {
  return entity.attributes.filter(
    (attribute) =>
      getAttributeScope(attribute) === 'relationship' &&
      attribute.relationship !== undefined &&
      !HIDDEN_ENTITIES.has(attribute.relationship.entity)
  );
}

/** Entities worth starting from: at least one drawable relationship. */
export function getGraphEntities(schema: Entity[]): Entity[] {
  return schema.filter((entity) => !HIDDEN_ENTITIES.has(entity.name) && getRelationshipAttributes(entity).length > 0);
}

export function getEntity(schema: Entity[], name: string): Entity | undefined {
  return find<Entity>(propEq(name, 'name'))(schema);
}

export function getEntityLabel(entity: Entity): string {
  return entity.menu?.label ?? entity.plural;
}

/** Colour per entity name, assigned in schema order and never re-cycled on filter. */
export function getEntityColors(schema: Entity[], theme: 'light' | 'dark'): { [entity: string]: string } {
  const palette = GRAPH_PALETTE[theme];

  return Object.fromEntries(
    schema.filter((entity) => !HIDDEN_ENTITIES.has(entity.name)).map((entity, index) => [entity.name, palette[index % palette.length]])
  );
}

/**
 * Selection of the display attribute: a scalar for global attributes, the
 * current scope's value for local ones. Relationship display attributes fall
 * back to the id.
 */
export function getDisplaySelection(entity: Entity | undefined, scope: string): string {
  const display = getDisplayAttribute(entity);

  if (!display) {
    return '';
  }

  const scopeType = getAttributeScope(display);

  if (scopeType === 'global') {
    return display.name;
  }

  if (scopeType === 'local') {
    return `${display.name} { ${getScopeFields(scope)} }`;
  }

  return '';
}

/** The scope value and the default one to fall back on, as the Desk queries select them. */
export function getScopeFields(scope: string): string {
  return scope === 'default' ? 'default' : `default ${scope}`;
}

function getRelatedSelection(attribute: Attribute, schema: Entity[], scope: string, args: string): string {
  const relatedEntity = getEntity(schema, attribute.relationship?.entity ?? '');

  return `${attribute.name}${args} { _id ${getDisplaySelection(relatedEntity, scope)} }`;
}

function getCountSelection(attribute: Attribute): string {
  return `${attribute.name}Connection { aggregate { count { nodes } } }`;
}

/** Records a one-hop load covers at most; more records come without their relationships. */
export const EXPAND_HOP_MAX_RECORDS = 5;

/**
 * Records by id or a sample of them; with `expand`, each comes with the first
 * page of every drawable relationship. Totals are left to the inspector:
 * counting every relationship of every record is what makes a load slow.
 */
export function buildRecordsQuery({
  entity,
  schema,
  scope,
  expand,
}: {
  entity: Entity;
  schema: Entity[];
  scope: string;
  expand: boolean;
}): string {
  const relationships = expand
    ? getRelationshipAttributes(entity).map((attribute) =>
        getRelatedSelection(attribute, schema, scope, `(limit: ${EXPAND_PAGE})`)
      )
    : [];

  return `query GraphRecords($where: ${entity.name}Where, $limit: Int) {
  ${entity.plural}(where: $where, limit: $limit) {
    _id
    ${getDisplaySelection(entity, scope)}
    ${relationships.join('\n    ')}
  }
}`;
}

/** One more page of a single relationship of one record. */
export function buildExpandQuery({
  entity,
  schema,
  scope,
  attribute,
}: {
  entity: Entity;
  schema: Entity[];
  scope: string;
  attribute: Attribute;
}): string {
  return `query GraphExpand($id: ID!, $offset: Int, $limit: Int) {
  ${entity.plural}(where: { _id: { eq: $id } }) {
    _id
    ${getRelatedSelection(attribute, schema, scope, '(limit: $limit, offset: $offset)')}
  }
}`;
}

/** The total per drawable relationship of one record. */
export function buildCountsQuery({ entity }: { entity: Entity }): string {
  return `query GraphCounts($id: ID!) {
  ${entity.plural}(where: { _id: { eq: $id } }) {
    _id
    ${getRelationshipAttributes(entity).map(getCountSelection).join('\n    ')}
  }
}`;
}

/** Attributes the inspector lists: visible scalars, global or in the current scope; rich text is skipped. */
export function getDetailAttributes(entity: Entity): Attribute[] {
  return entity.attributes
    .filter((attribute) => {
      const scopeType = getAttributeScope(attribute);

      return (
        !attribute.hidden &&
        attribute.dataType !== 'asset' &&
        attribute.inputType !== 'editor' &&
        (scopeType === 'global' || scopeType === 'local')
      );
    })
    .slice(0, DETAIL_ATTRIBUTE_LIMIT);
}

/** The scalar values of one record for the inspector. */
export function buildDetailsQuery({ entity, scope }: { entity: Entity; scope: string }): string {
  const fields = getDetailAttributes(entity).map((attribute) =>
    getAttributeScope(attribute) === 'local' ? `${attribute.name} { ${getScopeFields(scope)} }` : attribute.name
  );

  return `query GraphDetails($id: ID!) {
  ${entity.plural}(where: { _id: { eq: $id } }) {
    _id
    _updatedAt
    ${fields.join('\n    ')}
  }
}`;
}

/** Entities whose count-store total the API exposes (not space-bound). */
export function getTotalEntities(entities: Entity[]): Entity[] {
  return entities.filter((entity) => (entity.spaces?.length ?? 0) === 0);
}

export function buildTotalsQuery(entities: Entity[]): string {
  return `query GraphTotals {\n  ${getTotalEntities(entities)
    .map((entity) => `${entity.plural}Total`)
    .join('\n  ')}\n}`;
}

/** A scalar as the inspector shows it: the scope value of a local attribute, else the value itself. */
export function formatDetailValue(value: unknown, scope: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    const [first] = value as { [key: string]: unknown }[];

    return formatDetailValue(first?.[scope] ?? first?.default, scope);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/** The caption of a record: its display value in the scope, else in the default scope, else its id. */
export function captionOf(record: GraphRecord, entity: Entity | undefined, scope: string): string {
  const display = getDisplayAttribute(entity);
  const value = display ? record[display.name] : undefined;

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const [first] = value as { [key: string]: unknown }[];
    const scoped = first?.[scope] ?? first?.default;

    if (typeof scoped === 'string' || typeof scoped === 'number') {
      return String(scoped);
    }
  }

  return record._id;
}

/**
 * The edge between two nodes for a relationship: one Neo4j relationship per
 * entity pair, so the key is the same whichever side it was fetched from.
 */
export function edgeOf(source: GraphNode, target: GraphNode, attribute: Attribute): GraphEdge {
  const sourceAttribute = attribute.name;
  const targetAttribute = attribute.relationship?.field ?? attribute.name;
  const [left] = [source.key, target.key].sort();
  const leftAttribute = left === source.key ? sourceAttribute : targetAttribute;
  const right = left === source.key ? target.key : source.key;

  return { key: `${left}|${right}|${leftAttribute}`, source: source.key, target: target.key, sourceAttribute, targetAttribute };
}

/**
 * Nodes and edges from records of an entity; the related records under each
 * relationship attribute become nodes too, and `xConnection` aggregates
 * become counts.
 */
export function graphFromRecords({
  records,
  entity,
  schema,
  scope,
}: {
  records: GraphRecord[];
  entity: Entity;
  schema: Entity[];
  scope: string;
}): GraphData {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const counts: GraphCounts = {};
  const relationships = getRelationshipAttributes(entity);

  records.forEach((record) => {
    const source: GraphNode = {
      key: nodeKey(entity.name, record._id),
      entity: entity.name,
      id: record._id,
      label: captionOf(record, entity, scope),
    };
    nodes.set(source.key, source);

    relationships.forEach((attribute) => {
      const relatedEntityName = attribute.relationship?.entity ?? '';
      const relatedEntity = getEntity(schema, relatedEntityName);
      const relatedRecords = record[attribute.name];
      const connection = record[`${attribute.name}Connection`] as ConnectionCount | undefined;
      const total = connection?.aggregate?.count?.nodes;

      if (typeof total === 'number') {
        counts[source.key] = { ...counts[source.key], [attribute.name]: total };
      }

      if (!Array.isArray(relatedRecords)) {
        return;
      }

      (relatedRecords as GraphRecord[]).forEach((relatedRecord) => {
        const target: GraphNode = {
          key: nodeKey(relatedEntityName, relatedRecord._id),
          entity: relatedEntityName,
          id: relatedRecord._id,
          label: captionOf(relatedRecord, relatedEntity, scope),
        };

        if (!nodes.has(target.key)) {
          nodes.set(target.key, target);
        }

        if (target.key !== source.key) {
          const edge = edgeOf(source, target, attribute);

          if (!edges.has(edge.key)) {
            edges.set(edge.key, edge);
          }
        }
      });
    });
  });

  return { nodes: [...nodes.values()], edges: [...edges.values()], counts };
}

/** How many related records each record carries per relationship, to continue paging from. */
export function fetchedFromRecords(records: GraphRecord[], entity: Entity): GraphCounts {
  const fetched: GraphCounts = {};

  records.forEach((record) => {
    getRelationshipAttributes(entity).forEach((attribute) => {
      const related = record[attribute.name];

      if (Array.isArray(related)) {
        const key = nodeKey(entity.name, record._id);
        fetched[key] = { ...fetched[key], [attribute.name]: related.length };
      }
    });
  });

  return fetched;
}

/** The Graph app route for an entity, optionally for given records. */
export function graphPath(projectId: string, { entity, ids }: { entity: string; ids?: string[] }): string {
  const params = new URLSearchParams({ entity });

  if (ids && ids.length > 0) {
    params.set('ids', ids.join(','));
  }

  return `/${projectId}/graph?${params.toString()}`;
}

export function parseGraphParams(search: string): { entity: string; ids: string[] } | null {
  const params = new URLSearchParams(search);
  const entity = params.get('entity');

  if (!entity) {
    return null;
  }

  const ids = (params.get('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  return { entity, ids };
}
