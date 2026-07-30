import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { prop, uniqBy } from 'ramda';
import { gql, NetworkStatus } from '@apollo/client';
import type { OperationVariables } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { getGraphQLSchemaMismatchMessage, getServerError, parseErrorBody } from './error-utils';
import { getEntityQuery, getOperationEntityName, mapQueryResult, mapQueryResultForFormFields } from './queries';
import {
  subscribeEntityListPatch,
  subscribeEntityListRefetch,
  subscribeEntityListRemoval,
  type EntityListRowPatch,
} from './refetch-entity-lists';
import { useGraphQLError } from './graphql-context';
import type {
  EntityQueryAggregate,
  EntityQueryResults,
  FormEntityItem,
  MappedEntityQueryResults,
  MappedEntityItem,
  MappedFormEntityQueryResults,
  UseEntityQueryParams,
  ImageValue,
} from './types';

type FetchMoreOptions = {
  // `offset` is accepted for call-site compatibility but overridden by nextOffsetRef.
  variables: OperationVariables & { offset: number; limit: number };
};
type Results = (MappedEntityQueryResults | MappedFormEntityQueryResults) | { count: 0; results: [] };

export function useEntityQuery({
  entityNamePlural,
  schema,
  scope,
  variables,
  isForm,
  selection = 'full',
}: UseEntityQueryParams): {
  count: number;
  data: MappedEntityItem[] | FormEntityItem[] | ImageValue[] | undefined;
  fetchMore: (args: FetchMoreOptions) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  isProjectDisabled: boolean;
  isProjectReadOnly: boolean;
  reload: () => void;
  schemaErrorMessage: string | null;
} {
  const [result, setResult] = useState<Results>({
    count: 0,
    results: [],
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const isReloadingRef = useRef(false);
  // Next offset for fetchMore — advanced by each requested page window, not by the
  // deduplicated row count. Using unique rows.length as offset collapses when pages
  // overlap (unstable sorts / tied timestamps) into irregular steps like 25→35→42.
  const nextOffsetRef = useRef(0);
  // Tracks the query identity we last synced into local result state.
  // fetchMore updates Apollo `data` without changing this identity; syncing those
  // updates would wipe accumulated pages and retrigger infinite load-more.
  // Must include entity/scope — variables alone collide across entity navigations.
  const syncedQueryKeyRef = useRef<string | null>(null);
  const pendingQueryKeyRef = useRef<string | null>(null);
  const entityQuery = getEntityQuery(entityNamePlural, scope, schema, { selection });
  const queryDocument = useMemo(
    () =>
      gql`
        ${entityQuery.query}
      `,
    [entityQuery.query]
  );
  const { schemaErrorMessage, setSchemaErrorMessage } = useGraphQLError();
  const {
    loading: isLoading,
    data,
    fetchMore: fetchNextPage,
    refetch,
    error,
    networkStatus,
  } = useQuery<EntityQueryResults & EntityQueryAggregate>(queryDocument, {
    variables,
    notifyOnNetworkStatusChange: true,
  });
  const fetchNextPageRef = useRef(fetchNextPage);
  const refetchRef = useRef(refetch);
  const previousNetworkStatusRef = useRef(networkStatus);
  fetchNextPageRef.current = fetchNextPage;
  refetchRef.current = refetch;

  // Parse 403 error response to determine the specific error code
  const serverError = getServerError(error);
  const schemaMismatchMessage = getGraphQLSchemaMismatchMessage(error);

  const { isProjectDisabled, isProjectReadOnly } = (() => {
    if (serverError?.statusCode === 403) {
      const responseBody = parseErrorBody<{ code?: string }>(serverError.bodyText);

      if (responseBody && typeof responseBody.code === 'string') {
        if (responseBody.code === 'PROJECT_PAUSED') {
          return {
            isProjectDisabled: true,
            isProjectReadOnly: false,
          };
        }

        if (responseBody.code === 'READ_ONLY_MODE') {
          return {
            isProjectDisabled: false,
            isProjectReadOnly: true,
          };
        }
      }

      return {
        isProjectDisabled: true,
        isProjectReadOnly: false,
      };
    }

    return {
      isProjectDisabled: false,
      isProjectReadOnly: false,
    };
  })();

  const fetchMore = useCallback(
    (args: FetchMoreOptions): void => {
      if (isLoadingMoreRef.current || isReloadingRef.current) {
        return;
      }

      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);

      const limit = args.variables.limit;
      const offset = nextOffsetRef.current;

      fetchNextPageRef
        .current({
          ...args,
          variables: {
            ...args.variables,
            offset,
            limit,
          },
        })
        .then(({ data: res }) => {
          const mappedFetchMoreResults = mapResults({ data: res, entityNamePlural, isForm, schema, scope });
          // Advance by the fetched page window (capped at limit), not by how many unique
          // rows survived client-side merge. Cap protects against Apollo returning a
          // merged cache blob larger than the requested page.
          const pageLength = mappedFetchMoreResults.results.length;
          nextOffsetRef.current = offset + (pageLength === 0 ? 0 : Math.min(pageLength, limit));

          setResult((prevRows) => {
            const merged = uniqBy(prop('_id'), [
              ...prevRows.results,
              ...mappedFetchMoreResults.results,
            ]) as Results['results'];

            // Empty/duplicate pages must end pagination, otherwise load-more loops forever
            // when aggregate count is ahead of rows that the where-clause can actually return.
            if (merged.length === prevRows.results.length) {
              return {
                count: prevRows.results.length,
                results: prevRows.results,
              } as Results;
            }

            return {
              count: mappedFetchMoreResults.count,
              results: merged,
            } as Results;
          });
        })
        .catch((fetchError: unknown) => {
          console.error('Error fetching more data:', fetchError);
        })
        .finally(() => {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
        });
    },
    [entityNamePlural, isForm, schema, scope]
  );

  const reload = useCallback((): void => {
    if (isReloadingRef.current) {
      return;
    }

    isReloadingRef.current = true;
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    syncedQueryKeyRef.current = null;
    pendingQueryKeyRef.current = null;
    nextOffsetRef.current = 0;
    setIsReloading(true);
    setResult({ count: 0, results: [] });

    void refetchRef
      .current()
      .then(({ data: res }) => {
        const queryKey = JSON.stringify({ entityNamePlural, scope, selection, variables });
        const mapped = mapResults({ data: res, entityNamePlural, isForm, schema, scope });

        syncedQueryKeyRef.current = queryKey;
        pendingQueryKeyRef.current = null;
        nextOffsetRef.current = getVariablesOffset(variables) + mapped.results.length;
        setResult(mapped);
      })
      .catch((fetchError: unknown) => {
        console.error('Error reloading data:', fetchError);
      })
      .finally(() => {
        isReloadingRef.current = false;
        setIsReloading(false);
      });
  }, [entityNamePlural, isForm, schema, scope, selection, variables]);

  useEffect(() => {
    if (schemaMismatchMessage) {
      setSchemaErrorMessage(schemaMismatchMessage);

      return;
    }

    if (data && schemaErrorMessage && !error) {
      setSchemaErrorMessage(null);
    }
  }, [data, error, schemaErrorMessage, schemaMismatchMessage, setSchemaErrorMessage]);

  useEffect(() => {
    if (error || schemaMismatchMessage) {
      return;
    }

    const queryKey = JSON.stringify({ entityNamePlural, scope, selection, variables });

    // Already synced for this query identity — ignore Apollo `data` updates from fetchMore.
    if (syncedQueryKeyRef.current === queryKey) {
      return;
    }

    if (isLoading && pendingQueryKeyRef.current !== queryKey) {
      pendingQueryKeyRef.current = queryKey;
      nextOffsetRef.current = 0;
      setResult({ count: 0, results: [] });

      return;
    }

    if (isLoading) {
      return;
    }

    const mapped = mapResults({ data, entityNamePlural, isForm, schema, scope });
    syncedQueryKeyRef.current = queryKey;
    pendingQueryKeyRef.current = null;
    nextOffsetRef.current = getVariablesOffset(variables) + mapped.results.length;
    setResult(mapped);
  }, [data, entityNamePlural, error, isForm, isLoading, schema, schemaMismatchMessage, scope, selection, variables]);

  // After an Apollo refetch (delete/upload), replace accumulated pages with the
  // fresh first page. fetchMore uses NetworkStatus.fetchMore and is ignored.
  useEffect(() => {
    const previousStatus = previousNetworkStatusRef.current;
    previousNetworkStatusRef.current = networkStatus;

    if (error || schemaMismatchMessage || isReloadingRef.current) {
      return;
    }

    if (previousStatus !== NetworkStatus.refetch || networkStatus !== NetworkStatus.ready || !data) {
      return;
    }

    const queryKey = JSON.stringify({ entityNamePlural, scope, selection, variables });
    const mapped = mapResults({ data, entityNamePlural, isForm, schema, scope });
    syncedQueryKeyRef.current = queryKey;
    pendingQueryKeyRef.current = null;
    nextOffsetRef.current = getVariablesOffset(variables) + mapped.results.length;
    setResult(mapped);
  }, [
    data,
    entityNamePlural,
    error,
    isForm,
    networkStatus,
    schema,
    schemaMismatchMessage,
    scope,
    selection,
    variables,
  ]);

  // Soft-refresh after mutations (tags, deletes, uploads). Local paginated state
  // ignores Apollo cache writes, so we must refetch and remap explicitly.
  useEffect(() => {
    if (isForm) {
      return;
    }

    const listQueryName = `Get${getOperationEntityName(entityNamePlural)}`;

    const unsubscribeRefetch = subscribeEntityListRefetch((queryNames) => {
      if (!queryNames.has(listQueryName) || isLoadingMoreRef.current || isReloadingRef.current) {
        return;
      }

      return refetchRef
        .current()
        .then(({ data: res }) => {
          const queryKey = JSON.stringify({ entityNamePlural, scope, selection, variables });
          const mapped = mapResults({ data: res, entityNamePlural, isForm, schema, scope });
          syncedQueryKeyRef.current = queryKey;
          pendingQueryKeyRef.current = null;
          nextOffsetRef.current = getVariablesOffset(variables) + mapped.results.length;
          setResult(mapped);
        })
        .catch((fetchError: unknown) => {
          console.error('Error soft-refreshing entity list:', fetchError);
        });
    });

    const unsubscribeRemoval = subscribeEntityListRemoval((queryName, entityIds) => {
      if (queryName !== listQueryName) {
        return;
      }

      setResult((prev) => {
        const nextResults = prev.results.filter((row) => {
          const rowId = typeof row._id === 'string' ? row._id : undefined;

          return !rowId || !entityIds.has(rowId);
        });
        const removedCount = prev.results.length - nextResults.length;

        if (removedCount === 0) {
          return prev;
        }

        return {
          count: Math.max(0, prev.count - removedCount),
          results: nextResults,
        } as Results;
      });
    });

    const unsubscribePatch = subscribeEntityListPatch((queryName, patches) => {
      if (queryName !== listQueryName) {
        return;
      }

      setResult((prev) => applyEntityListPatches(prev, patches, variables?.sort));
    });

    return () => {
      unsubscribeRefetch();
      unsubscribeRemoval();
      unsubscribePatch();
    };
  }, [entityNamePlural, isForm, schema, scope, selection, variables]);

  return {
    // Refetch keeps existing rows visible; only initial load / explicit reload show as loading.
    isLoading: (isLoading && networkStatus !== NetworkStatus.refetch) || isReloading,
    isLoadingMore,
    fetchMore,
    reload,
    count: result.count,
    data: result.results,
    isProjectDisabled,
    isProjectReadOnly,
    schemaErrorMessage,
  };
}

function getVariablesOffset(variables: OperationVariables | undefined): number {
  const offset = variables?.offset;

  return typeof offset === 'number' && Number.isFinite(offset) ? offset : 0;
}

function mapResults(
  args: {
    data: (EntityQueryResults & EntityQueryAggregate) | undefined;
  } & UseEntityQueryParams
): MappedEntityQueryResults | MappedFormEntityQueryResults {
  const entityNamePlural = args.entityNamePlural as keyof FormEntityItem;

  if (!args.data?.[entityNamePlural]) {
    return { count: 0, results: [] };
  }

  return args.isForm
    ? mapQueryResultForFormFields(args.entityNamePlural, args.scope, args.data, args.schema)
    : mapQueryResult(args.entityNamePlural, args.scope, args.data, args.schema);
}

function applyEntityListPatches(
  prev: Results,
  patches: EntityListRowPatch[],
  sort: unknown
): Results {
  const patchById = new Map(patches.map((patch) => [patch._id, patch]));
  let didPatch = false;
  const nextResults = prev.results.map((row) => {
    const rowId = typeof row._id === 'string' ? row._id : undefined;

    if (!rowId) {
      return row;
    }

    const patch = patchById.get(rowId);

    if (!patch) {
      return row;
    }

    didPatch = true;

    return {
      ...row,
      ...patch.attributes,
    };
  });

  if (!didPatch) {
    return prev;
  }

  return {
    count: prev.count,
    results: sortEntityListResults(nextResults, sort),
  } as Results;
}

function sortEntityListResults<T extends { [key: string]: unknown }>(results: T[], sort: unknown): T[] {
  if (!Array.isArray(sort) || sort.length === 0) {
    return results;
  }

  const primarySort = sort[0];

  if (!primarySort || typeof primarySort !== 'object') {
    return results;
  }

  const [sortField, sortDirection] = Object.entries(primarySort as { [key: string]: unknown })[0] ?? [];

  if (!sortField || (sortDirection !== 'ASC' && sortDirection !== 'DESC')) {
    return results;
  }

  const direction = sortDirection === 'DESC' ? -1 : 1;

  return [...results].sort((left, right) => {
    const leftValue = left[sortField];
    const rightValue = right[sortField];
    const leftText = typeof leftValue === 'string' ? leftValue : '';
    const rightText = typeof rightValue === 'string' ? rightValue : '';

    return leftText.localeCompare(rightText) * direction;
  });
}
