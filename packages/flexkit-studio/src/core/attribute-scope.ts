import type { Attribute, ScopeType } from './types';

export function getAttributeScope(attribute: Attribute): ScopeType {
  if (attribute.dataType === 'asset') {
    return 'global';
  }

  return attribute.scope;
}
