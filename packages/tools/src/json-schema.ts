export function stripJsonSchemaMeta(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stripJsonSchemaMeta(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const result: { [key: string]: unknown } = {};

  for (const [key, nested] of Object.entries(value as { [key: string]: unknown })) {

    if (key === '$schema') {
      continue;
    }

    result[key] = stripJsonSchemaMeta(nested);
  }

  return result;
}
