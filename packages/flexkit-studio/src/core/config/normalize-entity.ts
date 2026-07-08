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

export function normalizeEntity(entity: Entity): Entity {
  entity.attributes.forEach((attribute) => {
    assertAssetScope(attribute, entity.name);
  });

  return {
    ...entity,
    attributes: entity.attributes.map(normalizeAttributeScope),
  };
}
