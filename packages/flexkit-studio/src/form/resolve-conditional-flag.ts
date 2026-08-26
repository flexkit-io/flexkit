import type { ConditionalFieldContext, ConditionalFlag } from '../core/types';
import type { FormEntityItem } from '../graphql-client/types';

export function unwrapFormRecord(formValues: FormEntityItem | undefined): {
  [attributeName: string]: unknown;
} {
  if (!formValues) {
    return {};
  }

  const record: { [attributeName: string]: unknown } = {};

  for (const [attributeName, field] of Object.entries(formValues)) {
    record[attributeName] = field?.value;
  }

  return record;
}

export function resolveConditionalFlag(
  flag: ConditionalFlag | undefined,
  context: ConditionalFieldContext
): boolean {
  if (typeof flag === 'function') {
    return Boolean(flag(context));
  }

  return flag === true;
}

export function isStaticallyHidden(hidden: ConditionalFlag | undefined): boolean {
  return hidden === true;
}
