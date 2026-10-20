'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { find, propEq } from 'ramda';
import { apiPaths } from './api-paths';
import { useAppContext } from './app-context';
import { useConfig } from './config/config-context';
import { getDisplayAttribute } from './get-display-attribute';
import type { Entity, RawResultItem, RawSearchResultItems, SearchRequestProps, SearchResultItem } from './types';

export function useSearch(
  projectId: string,
  searchRequest: SearchRequestProps | null
): { results: SearchResultItem[] | []; error: Error; isLoading: boolean } {
  const { scope } = useAppContext();
  const { currentProject } = useConfig();
  const schema = useMemo(() => currentProject?.schema ?? [], [currentProject]);
  const scopes = currentProject?.scopes;
  const defaultScope = scopes?.find((s) => s.isDefault)?.name ?? 'default';
  const swrKey = searchRequest?.commonParams.q ? JSON.stringify(searchRequest) : null;
  const { data, error, isLoading } = useSWR(
    swrKey,
    () =>
      fetch(apiPaths(projectId).search, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchRequest),
        method: 'POST',
        mode: 'cors',
      }).then((res) => res.json() as Promise<{ results: RawSearchResultItems }>),
    // Show the previous hits until the next request lands instead of flashing an empty list per keystroke.
    { keepPreviousData: true }
  );
  const results = useMemo(
    // SWR keeps the previous key's data while a new key loads, and also after the key becomes null.
    // Callers treat an empty query as "no search", so return no hits once there is nothing to search for.
    () => (swrKey ? (mapResults(data?.results ?? [], projectId, schema, scope, defaultScope) ?? []) : []),
    [data, defaultScope, projectId, schema, scope, swrKey]
  );

  return { results, error, isLoading };
}

function mapResults(
  results: RawSearchResultItems | undefined,
  projectId: string,
  schema: Entity[],
  scope: string,
  defaultScope: string
): SearchResultItem[] | undefined {
  return results
    ?.filter((result) => (result as RawResultItem)?.hits?.length > 0)
    .map((result) => {
      const item = result as RawResultItem;
      const entityNamePlural = item.collection.replace(`${projectId}_`, '').replace(/_\d+$/, '');
      const entitySchema = find<Entity>(propEq(entityNamePlural, 'plural'))(schema);

      if (!entitySchema) {
        return [];
      }

      const primaryAttributeName = getDisplayAttribute(entitySchema)?.name ?? '';
      const entityName = entitySchema?.name ?? entityNamePlural;

      // iterate over the hits and return an object with the primary attribute value first and then the rest of the attributes.
      return item.hits.map(({ document }) => {
        const primaryAttribute = document[primaryAttributeName];
        const scopedPrimaryAttribute =
          primaryAttribute && typeof primaryAttribute !== 'string'
            ? (primaryAttribute[scope] ?? primaryAttribute[defaultScope])
            : null;
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
