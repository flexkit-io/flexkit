import { useCallback } from 'react';
import { useConfig } from '../core/config/config-context';
import {
  getEntityListQueryName,
  scheduleEntityListPatch,
  type EntityListRowPatch,
} from './refetch-entity-lists';

/**
 * Patch active list rows for an entity without a soft-refetch.
 * Prefer this after mutations that only change row fields (e.g. tag connect/disconnect).
 */
export function usePatchEntityList(entityNameOrPlural: string): (patches: EntityListRowPatch[]) => void {
  const { currentProjectSchema: schema } = useConfig();

  return useCallback(
    (patches: EntityListRowPatch[]) => {
      if (!schema) {
        return;
      }

      scheduleEntityListPatch(getEntityListQueryName(entityNameOrPlural, schema), patches);
    },
    [entityNameOrPlural, schema]
  );
}
