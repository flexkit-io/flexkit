import { useEffect, useCallback, useState } from 'react';
import { prop, uniqBy } from 'ramda';
import { useQuery, gql } from '@apollo/client';
import { getEntityQuery, mapQueryResult, mapQueryResultForFormFields } from './queries';
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

type FetchMoreOptions = { variables: { options: { offset: number; limit: number } } };
type Results = (MappedEntityQueryResults | MappedFormEntityQueryResults) | { count: 0; results: [] };

export function useEntityQuery({ entityNamePlural, schema, scope, variables, isForm }: UseEntityQueryParams): {
  count: number;
  data: MappedEntityItem[] | FormEntityItem[] | ImageValue[] | undefined;
  fetchMore: (args: FetchMoreOptions) => void;
  isLoading: boolean;
  isProjectDisabled: boolean;
  isProjectReadOnly: boolean;
} {
  const [result, setResult] = useState<Results>({
    count: 0,
    results: [],
  });
  const entityQuery = getEntityQuery(entityNamePlural, scope, schema);
  const {
    loading: isLoading,
    data,
    fetchMore: fetchNextPage,
    error,
  } = useQuery(
    gql`
      ${entityQuery.query}
    `,
    { variables }
  );

  // Parse 403 error response to determine the specific error code
  const { isProjectDisabled, isProjectReadOnly } = (() => {
    if (error?.networkError && 'statusCode' in error.networkError && error.networkError.statusCode === 403) {
      // Try to parse the response body to get the error code
      try {
        const responseBody = 'result' in error.networkError ? error.networkError.result : null;

        if (responseBody && typeof responseBody === 'object' && 'code' in responseBody) {
          const errorCode = responseBody.code;

          return {
            isProjectDisabled: errorCode === 'PROJECT_PAUSED',
            isProjectReadOnly: errorCode === 'READ_ONLY_MODE',
          };
        }
      } catch {
        // If parsing fails, fall back to treating any 403 as project disabled for backward compatibility
      }

      // Fallback: if we can't determine the specific code, assume project is disabled
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

  const mappedResults = useCallback(
    () => mapResults({ data, entityNamePlural, isForm, schema, scope }),
    [data, entityNamePlural, isForm, schema, scope]
  );

  function fetchMore(args: FetchMoreOptions): void {
    fetchNextPage(args)
      .then(({ data: res }) => {
        const mappedFetchMoreResults = mapResults({ data: res, entityNamePlural, isForm, schema, scope });

        setResult((prevRows) => {
          return {
            count: mappedFetchMoreResults.count,
            results: uniqBy(prop('_id'), [...prevRows.results, ...mappedFetchMoreResults.results]),
          } as Results;
        });
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console -- show the error to the user
        console.error('Error fetching more data:', error);
      });
  }

  useEffect(() => {
    setResult(mappedResults);
  }, [mappedResults]);

  return { isLoading, fetchMore, count: result.count, data: result.results, isProjectDisabled, isProjectReadOnly };
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
