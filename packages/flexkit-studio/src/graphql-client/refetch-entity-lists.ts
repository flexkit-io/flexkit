import type { ApolloClient } from '@apollo/client';
import type { Schema } from '../core/types';
import { assetSchema } from '../entities/assets-schema';
import { getOperationEntityName } from './queries';

type EntityListRefreshListener = (queryNames: ReadonlySet<string>) => void | Promise<void>;
type EntityListRemovalListener = (queryName: string, entityIds: ReadonlySet<string>) => void;
type EntityListPatchListener = (queryName: string, patches: EntityListRowPatch[]) => void;

export type EntityListRowPatch = {
  _id: string;
  attributes: { [key: string]: string };
};

let refetchTimer: ReturnType<typeof setTimeout> | null = null;
const pendingQueryNames = new Set<string>();
const pendingResolvers: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];
const listeners = new Set<EntityListRefreshListener>();
const removalListeners = new Set<EntityListRemovalListener>();
const patchListeners = new Set<EntityListPatchListener>();

export function getEntityListQueryName(entityNameOrPlural: string, schema: Schema): string {
  if (entityNameOrPlural === '_asset' || entityNameOrPlural === '_assets') {
    return `Get${getOperationEntityName(assetSchema.plural)}`;
  }

  const byPlural = schema.find((entity) => entity.plural === entityNameOrPlural);
  const byName = schema.find((entity) => entity.name === entityNameOrPlural);
  const plural = byPlural?.plural ?? byName?.plural ?? entityNameOrPlural;

  return `Get${getOperationEntityName(plural)}`;
}

/**
 * Subscribe to soft list refreshes. Listeners should refetch their own query and
 * remap local paginated state (useEntityQuery ignores Apollo cache writes after sync).
 */
export function subscribeEntityListRefetch(listener: EntityListRefreshListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Subscribe to optimistic row removals (e.g. after delete) before the soft-refetch lands.
 */
export function subscribeEntityListRemoval(listener: EntityListRemovalListener): () => void {
  removalListeners.add(listener);

  return () => {
    removalListeners.delete(listener);
  };
}

/**
 * Subscribe to in-place row patches (e.g. tag connect/disconnect) without a full list refetch.
 */
export function subscribeEntityListPatch(listener: EntityListPatchListener): () => void {
  patchListeners.add(listener);

  return () => {
    patchListeners.delete(listener);
  };
}

/**
 * Immediately drop rows from mounted lists, then soft-refetch to sync counts/pages.
 */
export function scheduleEntityListRemoval(
  apolloClient: ApolloClient,
  queryName: string,
  entityIds: string[]
): Promise<void> {
  const ids = new Set(entityIds.filter(Boolean));

  if (ids.size > 0) {
    for (const listener of removalListeners) {
      listener(queryName, ids);
    }
  }

  return scheduleEntityListRefetch(apolloClient, queryName);
}

/**
 * Patch mounted list rows in place. Use when a mutation cannot change list cardinality
 * (e.g. tag connect/disconnect) so we avoid a full GetAssets soft-refetch.
 */
export function scheduleEntityListPatch(queryName: string, patches: EntityListRowPatch[]): void {
  const nextPatches = patches.filter((patch) => Boolean(patch._id));

  if (nextPatches.length === 0) {
    return;
  }

  for (const listener of patchListeners) {
    listener(queryName, nextPatches);
  }
}

/**
 * Ask mounted entity lists to soft-refresh. Debounced so batch deletes coalesce.
 */
export function scheduleEntityListRefetch(_apolloClient: ApolloClient, queryName: string): Promise<void> {
  pendingQueryNames.add(queryName);

  return new Promise<void>((resolve, reject) => {
    pendingResolvers.push({ resolve, reject });

    if (refetchTimer) {
      clearTimeout(refetchTimer);
    }

    refetchTimer = setTimeout(() => {
      const names = new Set(pendingQueryNames);
      const resolvers = pendingResolvers.splice(0);
      pendingQueryNames.clear();
      refetchTimer = null;

      void Promise.all([...listeners].map((listener) => Promise.resolve(listener(names))))
        .then(() => {
          for (const { resolve: finish } of resolvers) {
            finish();
          }
        })
        .catch((error: unknown) => {
          console.error('Error refreshing entity lists:', error);

          for (const { reject: fail } of resolvers) {
            fail(error);
          }
        });
    }, 50);
  });
}
