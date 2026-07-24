import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { prop, uniqBy } from 'ramda';
import { gql } from '@apollo/client';
import type { OperationVariables } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { getGraphQLSchemaMismatchMessage, getServerError, parseErrorBody } from './error-utils';
import { getEntityQuery, mapQueryResult, mapQueryResultForFormFields } from './queries';
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

type FetchMoreOptions = { variables: OperationVariables & { offset: number; limit: number } };
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
  } = useQuery<EntityQueryResults & EntityQueryAggregate>(queryDocument, { variables });
  const fetchNextPageRef = useRef(fetchNextPage);
  const refetchRef = useRef(refetch);
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

      fetchNextPageRef
        .current(args)
        .then(({ data: res }) => {
          const mappedFetchMoreResults = mapResults({ data: res, entityNamePlural, isForm, schema, scope });

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
    setIsReloading(true);
    setResult({ count: 0, results: [] });

    void refetchRef
      .current()
      .then(({ data: res }) => {
        const queryKey = JSON.stringify({ entityNamePlural, scope, selection, variables });

        syncedQueryKeyRef.current = queryKey;
        pendingQueryKeyRef.current = null;
        setResult(mapResults({ data: res, entityNamePlural, isForm, schema, scope }));
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
      setResult({ count: 0, results: [] });

      return;
    }

    if (isLoading) {
      return;
    }

    syncedQueryKeyRef.current = queryKey;
    pendingQueryKeyRef.current = null;
    setResult(mapResults({ data, entityNamePlural, isForm, schema, scope }));
  }, [data, entityNamePlural, error, isForm, isLoading, schema, schemaMismatchMessage, scope, selection, variables]);

  return {
    isLoading: isLoading || isReloading,
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
