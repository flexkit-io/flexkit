import useSWR from 'swr';
import { find, propEq } from 'ramda';
import { apiPaths } from './api-paths';
import { useAppContext } from './app-context';
import { useConfig } from './config/config-context';
import type { SingleProject } from './config/types';
import type {
  Attribute,
  Entity,
  RawResultItem,
  RawSearchResultItems,
  SearchRequestProps,
  SearchResultItem,
} from './types';

export function useSearch(
  projectId: string,
  searchRequest: SearchRequestProps | null
): { results: SearchResultItem[] | []; error: Error; isLoading: boolean } {
  const { scope } = useAppContext();
  const { projects, currentProjectId } = useConfig();
  const { schema, scopes } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const defaultScope = scopes?.find((s) => s.isDefault)?.name ?? 'default';
  const swrKey = searchRequest?.commonParams.q ? JSON.stringify(searchRequest) : null;
  const { data, error, isLoading } = useSWR(swrKey, () =>
    fetch(apiPaths(projectId).search, { body: JSON.stringify(searchRequest), method: 'POST', mode: 'cors' }).then(
      (res) => res.json() as Promise<{ results: RawSearchResultItems }>
    )
  );
  const results = mapResults(data?.results ?? [], projectId, schema, scope, defaultScope);

  return { results, error, isLoading };
}

/**
 * Find the name of the attribute of an entity with isPrimary === true.
 * The value of that attribute is returned as the value for the relationship attribute
 */
function getPrimaryAttributeName(schemaAttributes: Attribute[]): string {
  return schemaAttributes.find((attr) => attr.isPrimary)?.name ?? schemaAttributes[0]?.name;
}

function mapResults(
  results: RawSearchResultItems,
  projectId: string,
  schema: Entity[],
  scope: string,
  defaultScope: string
): SearchResultItem[] {
  return results
    .filter((result) => (result as RawResultItem).hits.length > 0)
    .map((result) => {
      const item = result as RawResultItem;
      const entityNamePlural = item.request_params.collection_name.replace(`${projectId}_`, '').replace(/_\d+$/, '');
      const entitySchema = find<Entity>(propEq(entityNamePlural, 'plural'))(schema);

      if (!entitySchema) {
        return [];
      }

      const primaryAttributeName = getPrimaryAttributeName(entitySchema?.attributes ?? []);
      const entityName = entitySchema?.name ?? entityNamePlural;

      // iterate over the hits and return an object with the primary attribute value first and then the rest of the attributes.
      return item.hits.map(({ document }) => {
        const primaryAttribute = document[primaryAttributeName];
        const scopedPrimaryAttribute =
          typeof primaryAttribute !== 'string' ? (primaryAttribute[scope] ?? primaryAttribute[defaultScope]) : null;
        const primaryAttributeValue = scopedPrimaryAttribute ?? document[primaryAttributeName];
        const attributes = Object.entries(document).reduce(
          (acc: Omit<SearchResultItem, '_id' | '_entityName' | '_entityNamePlural'>, [key, value]) => {
            if (key !== primaryAttributeName && key !== 'id' && key !== '_updatedAt') {
              const scopedValue = typeof value !== 'string' ? (value[scope] ?? value[defaultScope]) : value;

              acc[key] = scopedValue;
            }

            return acc;
          },
          {}
        );

        return {
          _id: document.id,
          _entityName: entityName,
          _entityNamePlural: entityNamePlural,
          [primaryAttributeName]: primaryAttributeValue as string,
          ...attributes,
        };
      });
    })
    .flat();
}
