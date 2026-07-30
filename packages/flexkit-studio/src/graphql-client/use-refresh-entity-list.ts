import { useCallback } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useConfig } from '../core/config/config-context';
import { getEntityListQueryName, scheduleEntityListRefetch } from './refetch-entity-lists';

/**
 * Soft-refetch active list queries for an entity without clearing the current rows first.
 * Prefer this after mutations; use `useEntityQuery().reload` when an explicit loading state is desired.
 */
export function useRefreshEntityList(entityNameOrPlural: string): () => Promise<void> {
  const apolloClient = useApolloClient();
  const { currentProjectSchema: schema } = useConfig();

  return useCallback(async () => {
    if (!schema) {
      return;
    }

    await scheduleEntityListRefetch(apolloClient, getEntityListQueryName(entityNameOrPlural, schema));
  }, [apolloClient, entityNameOrPlural, schema]);
}
