import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { findEntitySchema, getClassifiedAttributes, getScopeNames } from './schema';
import type { ConfiguredProject, EntitySchema } from './schema';

export type ParsedEntity = {
  line: number;
  entity: EntitySchema;
  _id: string;
  globals: { [name: string]: unknown };
  locals: { name: string; dataType: string; values: { [scope: string]: unknown } }[];
  assetSingles: { name: string; ref: string }[];
  assetMultiples: { name: string; refs: string[] }[];
  refSingles: { name: string; refId: string }[];
  refMultiples: { name: string; refIds: string[] }[];
};

export type ParseResult = {
  entities: ParsedEntity[];
  errors: string[];
  /** Unique asset references (file paths resolved against baseDir, or URLs). */
  assetRefs: string[];
};

function isPlainObject(value: unknown): value is { [key: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Resolves an `_asset` reference to a canonical key: an absolute file path or
 * an http(s) URL. Accepts `file://relative/path`, plain relative paths and
 * absolute URLs.
 */
export function resolveAssetRef(ref: string, baseDir: string): string {
  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    return ref;
  }

  const withoutScheme = ref.startsWith('file://') ? ref.slice('file://'.length) : ref;

  return path.resolve(baseDir, withoutScheme);
}

function readAssetRef(value: unknown): string | null {
  if (isPlainObject(value) && typeof value._asset === 'string' && value._asset.length > 0) {
    return value._asset;
  }

  return null;
}

function readEntityRef(value: unknown): string | null {
  if (isPlainObject(value) && typeof value._ref === 'string' && value._ref.length > 0) {
    return value._ref;
  }

  return null;
}

/**
 * Reads the per-scope values of a locally scoped attribute. Accepts either a
 * plain value (applied to the default scope) or {"_scopes": {"default": ...,
 * "uk": ...}} with one entry per project scope.
 */
function readScopedValues(
  value: unknown,
  scopeNames: string[]
): { values?: { [scope: string]: unknown }; error?: string } {
  if (!isPlainObject(value)) {
    return { values: { default: value } };
  }

  if (!isPlainObject(value._scopes)) {
    return { error: `expects a plain value or {"_scopes": {"<scope>": <value>}}` };
  }

  const unknownScopes = Object.keys(value._scopes).filter((scope) => !scopeNames.includes(scope));

  if (unknownScopes.length > 0) {
    return {
      error: `references unknown scope${unknownScopes.length === 1 ? '' : 's'} ${unknownScopes.join(', ')} (project scopes: ${scopeNames.join(', ')})`,
    };
  }

  const values: { [scope: string]: unknown } = {};

  for (const [scope, scopedValue] of Object.entries(value._scopes)) {
    if (scopedValue !== null && scopedValue !== undefined) {
      values[scope] = scopedValue;
    }
  }

  if (Object.keys(values).length === 0) {
    return { error: 'has an empty "_scopes" object' };
  }

  return { values };
}

/**
 * Parses NDJSON lines into schema-validated entities and collects every
 * referenced asset source.
 */
export function parseImportLines(lines: string[], project: ConfiguredProject, baseDir: string): ParseResult {
  const entities: ParsedEntity[] = [];
  const errors: string[] = [];
  const assetRefSet = new Set<string>();
  const scopeNames = getScopeNames(project);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const raw = lines[index].trim();

    if (!raw) {
      continue;
    }

    let record: unknown;

    try {
      record = JSON.parse(raw);
    } catch {
      errors.push(`Line ${lineNumber}: invalid JSON.`);
      continue;
    }

    if (!isPlainObject(record)) {
      errors.push(`Line ${lineNumber}: expected a JSON object.`);
      continue;
    }

    const type = record._type;

    if (typeof type !== 'string' || type.length === 0) {
      errors.push(`Line ${lineNumber}: missing "_type".`);
      continue;
    }

    const entitySchema = findEntitySchema(project, type);

    if (!entitySchema) {
      errors.push(`Line ${lineNumber}: unknown entity type "${type}".`);
      continue;
    }

    const _id = typeof record._id === 'string' && record._id.length > 0 ? record._id : randomUUID();
    const classified = getClassifiedAttributes(entitySchema);
    const attributeByName = new Map(classified.map((item) => [item.attribute.name, item]));
    const parsed: ParsedEntity = {
      line: lineNumber,
      entity: entitySchema,
      _id,
      globals: {},
      locals: [],
      assetSingles: [],
      assetMultiples: [],
      refSingles: [],
      refMultiples: [],
    };
    let lineHasErrors = false;

    for (const [key, value] of Object.entries(record)) {
      if (key === '_type' || key === '_id') {
        continue;
      }

      const classifiedAttribute = attributeByName.get(key);

      if (!classifiedAttribute) {
        errors.push(`Line ${lineNumber}: unknown attribute "${key}" on entity "${entitySchema.name}".`);
        lineHasErrors = true;
        continue;
      }

      if (value === null || value === undefined) {
        continue;
      }

      const { attribute, kind } = classifiedAttribute;

      switch (kind) {
        case 'global': {
          parsed.globals[key] = value;
          break;
        }

        case 'local': {
          const { values, error } = readScopedValues(value, scopeNames);

          if (error || !values) {
            errors.push(`Line ${lineNumber}: attribute "${key}" ${error ?? 'has no usable value'}.`);
            lineHasErrors = true;
            break;
          }

          parsed.locals.push({ name: key, dataType: attribute.dataType, values });
          break;
        }

        case 'asset-single': {
          const ref = readAssetRef(value);

          if (!ref) {
            errors.push(`Line ${lineNumber}: attribute "${key}" expects {"_asset": "<file or url>"}.`);
            lineHasErrors = true;
            break;
          }

          const resolved = resolveAssetRef(ref, baseDir);

          assetRefSet.add(resolved);
          parsed.assetSingles.push({ name: key, ref: resolved });
          break;
        }

        case 'asset-multiple': {
          const values = Array.isArray(value) ? value : [value];
          const refs: string[] = [];

          for (const item of values) {
            const ref = readAssetRef(item);

            if (!ref) {
              errors.push(`Line ${lineNumber}: attribute "${key}" expects an array of {"_asset": "<file or url>"}.`);
              lineHasErrors = true;
              continue;
            }

            const resolved = resolveAssetRef(ref, baseDir);

            assetRefSet.add(resolved);
            refs.push(resolved);
          }

          if (refs.length > 0) {
            parsed.assetMultiples.push({ name: key, refs });
          }

          break;
        }

        case 'ref-single': {
          const refId = readEntityRef(value);

          if (!refId) {
            errors.push(`Line ${lineNumber}: attribute "${key}" expects {"_ref": "<entity _id>"}.`);
            lineHasErrors = true;
            break;
          }

          parsed.refSingles.push({ name: key, refId });
          break;
        }

        case 'ref-multiple': {
          const values = Array.isArray(value) ? value : [value];
          const refIds: string[] = [];

          for (const item of values) {
            const refId = readEntityRef(item);

            if (!refId) {
              errors.push(`Line ${lineNumber}: attribute "${key}" expects an array of {"_ref": "<entity _id>"}.`);
              lineHasErrors = true;
              continue;
            }

            refIds.push(refId);
          }

          if (refIds.length > 0) {
            parsed.refMultiples.push({ name: key, refIds });
          }

          break;
        }
      }
    }

    if (!lineHasErrors) {
      entities.push(parsed);
    }
  }

  return { entities, errors, assetRefs: [...assetRefSet] };
}
