import type Client from '../../util/client';
import { getDefaultScopeName } from '../../util/default-scope';
import { isAPIError } from '../../util/error-utils';

export interface RecordAttribute {
  name: string;
  label?: string;
  dataType: string;
  scope?: 'local' | 'global' | 'relationship';
  inputType?: string;
  hidden?: boolean;
  relationship?: {
    entity: string;
    mode: 'single' | 'multiple';
    field?: string;
  };
}

export interface RecordEntity {
  name: string;
  plural: string;
  display?: string;
  attributes: RecordAttribute[];
}

export interface RecordSchema {
  entities: RecordEntity[];
  /** Every scope name; locally scoped attributes have one GraphQL field per scope. */
  scopeNames: string[];
  /** The scope shown and written when none is chosen. */
  defaultScope: string;
}

export type AttributeKind = 'global' | 'local' | 'asset-single' | 'asset-multiple' | 'ref-single' | 'ref-multiple';

interface ScopeDefinition {
  name: string;
  isDefault?: boolean;
}

interface SchemaResponse {
  schema?: RecordEntity[];
  scopes?: ScopeDefinition[];
}

/** System fields every entity has besides its attributes. */
export const SYSTEM_FIELDS = ['_id', '_createdAt', '_updatedAt'] as const;

/** Mirrors the GraphQL generator: a relationship to `_asset` or an `asset` data type is an asset field. */
export function classifyAttribute(attribute: RecordAttribute): AttributeKind {
  if (attribute.dataType === 'asset') {
    return 'asset-single';
  }

  if (attribute.relationship?.entity === '_asset') {
    return attribute.relationship.mode === 'single' ? 'asset-single' : 'asset-multiple';
  }

  if (attribute.relationship && (attribute.scope === 'relationship' || attribute.inputType === 'relationship')) {
    return attribute.relationship.mode === 'single' ? 'ref-single' : 'ref-multiple';
  }

  if (attribute.scope === 'local') {
    return 'local';
  }

  return 'global';
}

export function isScalarKind(kind: AttributeKind): boolean {
  return kind === 'global' || kind === 'local';
}

/** Builds the scope list the GraphQL generator uses (`default` when the project has no scopes). */
export function toRecordSchema(entities: RecordEntity[], scopes: ScopeDefinition[] | undefined): RecordSchema {
  const scopeNames = scopes && scopes.length > 0 ? scopes.map((scope) => scope.name) : ['default'];
  const defaultScope = getDefaultScopeName(scopes);

  return {
    entities: entities.filter((entity) => !entity.name.startsWith('_')),
    scopeNames,
    defaultScope,
  };
}

/**
 * Reads the deployed schema (`GET /schema`). Backends that refuse project API
 * tokens on that route answer 403; the local flexkit.config.ts of the same
 * project is used instead then.
 */
export async function fetchRecordSchema(client: Client, projectId: string): Promise<RecordSchema> {
  try {
    const response = await client.fetch<SchemaResponse>('/schema', { projectId });

    return toRecordSchema(response.schema ?? [], response.scopes);
  } catch (err: unknown) {
    const local = client.flexkitConfig?.projects.find((project) => project.projectId === projectId);

    if (isAPIError(err) && err.status === 403 && local) {
      client.output.debug('GET /schema refused this token; using the schema from the local config instead.');

      return toRecordSchema(local.schema as unknown as RecordEntity[], local.scopes as ScopeDefinition[] | undefined);
    }

    throw err;
  }
}

/** Finds an entity by its name or plural, case-insensitively when there is no exact match. */
export function findEntity(schema: RecordSchema, name: string): RecordEntity | undefined {
  const exact = schema.entities.find((entity) => entity.name === name || entity.plural === name);

  if (exact) {
    return exact;
  }

  const lower = name.toLowerCase();

  return schema.entities.find((entity) => entity.name.toLowerCase() === lower || entity.plural.toLowerCase() === lower);
}

/** Like `findEntity`, but throws an error that lists the available entities. */
export function requireEntity(schema: RecordSchema, name: string): RecordEntity {
  const entity = findEntity(schema, name);

  if (!entity) {
    const available = schema.entities.map((item) => item.plural).join(', ');

    throw new Error(
      available
        ? `Unknown entity "${name}". Available entities: ${available}.`
        : `Unknown entity "${name}". The project has no deployed entities.`
    );
  }

  return entity;
}

/** The attribute used as the record label: `display`, then the first attribute. */
export function getDisplayAttribute(entity: RecordEntity): RecordAttribute | undefined {
  if (entity.display) {
    return entity.attributes.find((attribute) => attribute.name === entity.display) ?? entity.attributes[0];
  }

  return entity.attributes[0];
}

export function resolveScope(schema: RecordSchema, scope: string | undefined): string {
  if (!scope) {
    return schema.defaultScope;
  }

  if (!schema.scopeNames.includes(scope)) {
    throw new Error(`Unknown scope "${scope}". Available scopes: ${schema.scopeNames.join(', ')}.`);
  }

  return scope;
}
