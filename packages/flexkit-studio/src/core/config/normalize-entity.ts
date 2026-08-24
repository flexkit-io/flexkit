import type { Attribute, Entity } from '../types';

function assertAssetScope(attribute: Attribute, entityName: string): void {
  if (attribute.dataType !== 'asset') {
    return;
  }

  if (attribute.scope !== undefined && attribute.scope !== 'global') {
    throw new Error(
      `Attribute "${attribute.name}" in entity "${entityName}" uses dataType "asset" but scope "${attribute.scope}". Asset attributes must use scope "global" or omit scope.`
    );
  }
}

function normalizeAttributeScope(attribute: Attribute): Attribute {
  if (attribute.dataType !== 'asset') {
    return attribute;
  }

  return {
    ...attribute,
    scope: 'global',
  };
}

function assertDisplayAttribute(entity: Entity): void {
  const displayAttribute = entity.display
    ? entity.attributes.find((attribute) => attribute.name === entity.display)
    : entity.attributes[0];

  if (entity.display && !displayAttribute) {
    throw new Error(
      `Entity "${entity.name}" sets display to "${entity.display}", but no attribute has that name.`
    );
  }

  if (!displayAttribute || (displayAttribute.spaces ?? []).length === 0) {
    return;
  }

  throw new Error(
    `Entity "${entity.name}" cannot use space-bound attribute "${displayAttribute.name}" as its display field.`
  );
}

export function normalizeEntity(entity: Entity): Entity {
  entity.attributes.forEach((attribute) => {
    assertAssetScope(attribute, entity.name);
  });

  assertDisplayAttribute(entity);

  return {
    ...entity,
    attributes: entity.attributes.map(normalizeAttributeScope),
  };
}
