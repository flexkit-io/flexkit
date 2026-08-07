import type { Attribute, Entity } from './types';

/**
 * Space bindings use OR semantics: a resource bound to ['finance', 'mkt'] is
 * accessible to members of either space. Unbound resources are accessible to
 * everyone. This is a UI convenience only — the server enforces the same
 * rules through generated @authorization directives.
 */
export function canAccessSpaces(userSpaces: string[] | undefined, resourceSpaces: string[] | undefined): boolean {
  if (!resourceSpaces || resourceSpaces.length === 0) {
    return true;
  }

  return (userSpaces ?? []).some((code) => resourceSpaces.includes(code));
}

export function filterAttributesForSpaces(attributes: Attribute[], userSpaces: string[] | undefined): Attribute[] {
  return attributes.filter((attribute) => canAccessSpaces(userSpaces, attribute.spaces));
}

export function filterEntitiesForSpaces(schema: Entity[], userSpaces: string[] | undefined): Entity[] {
  return schema
    .filter((entity) => canAccessSpaces(userSpaces, entity.spaces))
    .map((entity) => ({
      ...entity,
      attributes: filterAttributesForSpaces(entity.attributes, userSpaces),
    }));
}
