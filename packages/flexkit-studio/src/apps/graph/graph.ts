import { find, propEq } from 'ramda';
import { getAttributeScope } from '../../core/attribute-scope';
import { getDisplayAttribute } from '../../core/get-display-attribute';
import type { Attribute, Entity } from '../../core/types';

/**
 * Pure helpers of the Graph app: build the GraphQL query that fetches a
 * sample of records with their relationships, and turn the result into the
 * nodes and edges the canvas draws. No React, no sigma, so the rules are
 * unit-testable.
 */

/** Related records fetched per relationship attribute of each sampled record. */
export const RELATED_LIMIT = 10;

/** Entities whose nodes are never drawn: assets are media, not records. */
const HIDDEN_ENTITIES = new Set(['_asset']);

/**
 * Categorical palette, one hue per entity in fixed order (light and dark
 * surfaces step the same hues). Taken from the validated dataviz palette.
 */
export const GRAPH_PALETTE = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
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
  /** The relationship attribute name as seen from the sampled entity. */
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type GraphRecord = { _id: string; [key: string]: unknown };

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
    return `${display.name} { ${scope} }`;
  }

  return '';
}

export function buildGraphQuery({
  entity,
  schema,
  scope,
}: {
  entity: Entity;
  schema: Entity[];
  scope: string;
}): string {
  const related = getRelationshipAttributes(entity).map((attribute) => {
    const relatedEntity = find<Entity>(propEq(attribute.relationship?.entity, 'name'))(schema);

    return `${attribute.name}(limit: ${RELATED_LIMIT}) { _id ${getDisplaySelection(relatedEntity, scope)} }`;
  });

  return `query GraphSample($limit: Int) {
  ${entity.plural}(limit: $limit) {
    _id
    ${getDisplaySelection(entity, scope)}
    ${related.join('\n    ')}
  }
}`;
}

/** The caption of a record: its display value in the scope, else its id. */
export function captionOf(record: GraphRecord, entity: Entity | undefined, scope: string): string {
  const display = getDisplayAttribute(entity);
  const value = display ? record[display.name] : undefined;

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const [first] = value as { [key: string]: unknown }[];
    const scoped = first?.[scope];

    if (typeof scoped === 'string' || typeof scoped === 'number') {
      return String(scoped);
    }
  }

  return record._id;
}

/** Nodes and edges from a page of records; related records become nodes too. */
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
  const relationships = getRelationshipAttributes(entity);

  records.forEach((record) => {
    const sourceKey = nodeKey(entity.name, record._id);
    nodes.set(sourceKey, { key: sourceKey, entity: entity.name, id: record._id, label: captionOf(record, entity, scope) });

    relationships.forEach((attribute) => {
      const relatedEntityName = attribute.relationship?.entity ?? '';
      const relatedEntity = find<Entity>(propEq(relatedEntityName, 'name'))(schema);
      const relatedRecords = record[attribute.name];

      if (!Array.isArray(relatedRecords)) {
        return;
      }

      (relatedRecords as GraphRecord[]).forEach((relatedRecord) => {
        const targetKey = nodeKey(relatedEntityName, relatedRecord._id);

        if (!nodes.has(targetKey)) {
          nodes.set(targetKey, {
            key: targetKey,
            entity: relatedEntityName,
            id: relatedRecord._id,
            label: captionOf(relatedRecord, relatedEntity, scope),
          });
        }

        // One Neo4j relationship per entity pair, so the edge is the same
        // whichever side it was fetched from.
        const [left, right] = [sourceKey, targetKey].sort();
        const edgeKey = `${left}|${right}`;

        if (!edges.has(edgeKey) && left !== right) {
          edges.set(edgeKey, { key: edgeKey, source: sourceKey, target: targetKey, label: attribute.name });
        }
      });
    });
  });

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
