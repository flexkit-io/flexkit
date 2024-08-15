import { useEffect, useCallback, useState } from 'react';
import { prop, uniqBy } from 'ramda';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
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
} from './types';

type FetchMoreOptions = { variables: { options: { offset: number; limit: number } } };
type Results = (MappedEntityQueryResults | MappedFormEntityQueryResults) | { count: 0; results: [] };

export function useEntityQuery({ entityNamePlural, schema, scope, variables, isForm }: UseEntityQueryParams): {
  count: number;
  data: MappedEntityItem[] | FormEntityItem[] | undefined;
  fetchMore: (args: FetchMoreOptions) => void;
  isLoading: boolean;
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
  } = useQuery(
    gql`
      ${entityQuery.query}
    `,
    { variables }
  );

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

  return { isLoading, fetchMore, count: result.count, data: result.results };
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
