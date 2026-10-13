import type { FormEntityItem } from '../graphql-client/types';

/** Flattens `{ name: { value } }` form values into `{ name: value }`. */
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
