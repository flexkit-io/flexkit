import type { UiAttribute as Attribute } from '@flexkit/schema';
import { getDefaultScopeName } from '../default-scope';
import type { FlexkitConfig } from '../../types';

export type ConfiguredProject = FlexkitConfig['projects'][number];
export type EntitySchema = ConfiguredProject['schema'][number];

export type AttributeKind =
  | 'global'
  | 'local'
  | 'asset-single'
  | 'asset-multiple'
  | 'ref-single'
  | 'ref-multiple';

export type ClassifiedAttribute = {
  attribute: Attribute;
  kind: AttributeKind;
};

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function classifyAttribute(attribute: Attribute): AttributeKind {
  if (attribute.dataType === 'asset') {
    return 'asset-single';
  }

  if (attribute.relationship?.entity === '_asset') {
    return attribute.relationship.mode === 'single' ? 'asset-single' : 'asset-multiple';
  }

  if (attribute.relationship && attribute.inputType === 'relationship') {
    return attribute.relationship.mode === 'single' ? 'ref-single' : 'ref-multiple';
  }

  if (attribute.scope === 'local') {
    return 'local';
  }

  return 'global';
}

export function getEntitySchemas(project: ConfiguredProject): EntitySchema[] {
  return project.schema;
}

/**
 * Returns every scope name of the project, the default scope (`isDefault`,
 * whatever its name) first; `['default']` for a project without scopes.
 * Locally scoped attribute nodes have one GraphQL field per scope name.
 */
export function getScopeNames(project: ConfiguredProject): string[] {
  const scopes = project.scopes ?? [];
  const defaultScope = getDefaultScopeName(scopes);

  return [defaultScope, ...scopes.map((scope) => scope.name).filter((name) => name !== defaultScope)];
}

/**
 * Finds an entity schema by name or plural (import lines use `_type`).
 */
export function findEntitySchema(project: ConfiguredProject, type: string): EntitySchema | undefined {
  return getEntitySchemas(project).find((entity) => entity.name === type || entity.plural === type);
}

export function getClassifiedAttributes(entity: EntitySchema): ClassifiedAttribute[] {
  return entity.attributes.map((attribute) => ({ attribute, kind: classifyAttribute(attribute) }));
}
