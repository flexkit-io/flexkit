import type { Attribute, Entity } from './types';

/**
 * Resolve the attribute used as the entity's human-readable label.
 * Uses `entity.display` when it matches an attribute name; otherwise the first attribute.
 */
export function getDisplayAttribute(entity: Entity | undefined): Attribute | undefined {
  if (!entity?.attributes.length) {
    return undefined;
  }

  if (entity.display) {
    return entity.attributes.find((attr) => attr.name === entity.display) ?? entity.attributes[0];
  }

  return entity.attributes[0];
}
