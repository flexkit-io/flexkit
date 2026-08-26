import { ALL_FIELDS_GROUP, ALL_FIELDS_GROUP_NAME } from '../core/field-groups';
import type { Attribute, ConditionalFieldContext, FieldGroup } from '../core/types';
import { resolveConditionalFlag } from './resolve-conditional-flag';

export function getAttributeGroupNames(attribute: Attribute): string[] {
  if (typeof attribute.group === 'string') {
    return [attribute.group];
  }

  if (Array.isArray(attribute.group)) {
    return attribute.group;
  }

  return [];
}

export function attributeBelongsToGroup(attribute: Attribute, groupName: string): boolean {
  if (groupName === ALL_FIELDS_GROUP_NAME) {
    return true;
  }

  return getAttributeGroupNames(attribute).includes(groupName);
}

export function resolveVisibleFieldGroups(
  groups: FieldGroup[] | undefined,
  context: ConditionalFieldContext
): FieldGroup[] {
  if (!groups || groups.length === 0) {
    return [];
  }

  const authoredAllFields = groups.find((group) => group.name === ALL_FIELDS_GROUP_NAME);
  const namedGroups = groups.filter((group) => group.name !== ALL_FIELDS_GROUP_NAME);
  const allFieldsGroup: FieldGroup = {
    ...ALL_FIELDS_GROUP,
    ...authoredAllFields,
  };
  const resolvedGroups = [allFieldsGroup, ...namedGroups];

  return resolvedGroups.filter((group) => !resolveConditionalFlag(group.hidden, context));
}

export function getDefaultFieldGroupName(groups: FieldGroup[]): string {
  const defaultGroup = groups.find((group) => group.default);

  if (defaultGroup) {
    return defaultGroup.name;
  }

  const firstNamedGroup = groups.find((group) => group.name !== ALL_FIELDS_GROUP_NAME);

  if (firstNamedGroup) {
    return firstNamedGroup.name;
  }

  return ALL_FIELDS_GROUP_NAME;
}
