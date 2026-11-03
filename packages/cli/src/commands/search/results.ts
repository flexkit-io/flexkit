import { getDisplayAttribute, requireEntity, type RecordEntity, type RecordSchema } from '../records/schema';

export const DEFAULT_SEARCH_LIMIT = 10;
/** The /search route rejects a larger `limit`. */
export const MAX_SEARCH_LIMIT = 100;

export interface SearchRequestBody {
  searchRequests: { searches: { collection: string }[] };
  commonParams: { q: string; limit: number };
}

export interface SearchResponse {
  results?: {
    collection?: string;
    hits?: { document?: { [key: string]: unknown }; score?: unknown }[];
    found?: number;
  }[];
}

export interface SearchHit {
  entity: string;
  plural: string;
  _id: string;
  label: string;
  score: number;
  document: { [key: string]: unknown };
}

/** Every entity, or those named by `--entity` (name or plural, repeatable or comma-separated). */
export function selectSearchEntities(schema: RecordSchema, names: string[] | undefined): RecordEntity[] {
  const requested = (names ?? [])
    .flatMap((name) => name.split(','))
    .map((name) => name.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    return schema.entities;
  }

  const entities = requested.map((name) => requireEntity(schema, name));

  return entities.filter((entity, index) => entities.indexOf(entity) === index);
}

/** The body `POST /search` expects: one search per collection (entity plural). */
export function buildSearchRequest(entities: RecordEntity[], text: string, limit: number): SearchRequestBody {
  return {
    searchRequests: { searches: entities.map((entity) => ({ collection: entity.plural })) },
    commonParams: { q: text, limit },
  };
}

/** A display value may be a scoped object (`{ default: 'Bag', de: 'Tasche' }`). */
function labelOf(value: unknown, scope: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const scoped = value as { [key: string]: unknown };
    const picked =
      scoped[scope] ?? Object.values(scoped).find((item) => item !== null && item !== undefined && item !== '');

    return picked === null || picked === undefined ? '' : String(picked);
  }

  return String(value);
}

/**
 * Flattens the per-collection results (in the order of the request) into one
 * list ordered by score, cut to `limit`.
 */
export function flattenSearchResults(
  entities: RecordEntity[],
  response: SearchResponse,
  scope: string,
  limit: number
): SearchHit[] {
  const hits: SearchHit[] = [];

  (response.results ?? []).forEach((result, index) => {
    const entity = entities[index];

    if (!entity) {
      return;
    }

    const displayName = getDisplayAttribute(entity)?.name;

    for (const hit of result.hits ?? []) {
      const document = hit.document ?? {};
      const id = typeof document._id === 'string' ? document._id : '';

      if (!id) {
        continue;
      }

      hits.push({
        entity: entity.name,
        plural: entity.plural,
        _id: id,
        label: displayName ? labelOf(document[displayName], scope) : '',
        score: typeof hit.score === 'number' ? hit.score : Number(hit.score) || 0,
        document,
      });
    }
  });

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
