import { useEffect, useState } from 'react';
import { prop, uniqBy } from 'ramda';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import { useQuery, gql, type FetchMoreOptions } from '@apollo/client';
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

export function useEntityQuery({ entityNamePlural, schema, scope, variables, isForm }: UseEntityQueryParams): {
  count: number;
  data: MappedEntityItem[] | FormEntityItem[] | undefined;
  fetchMore: (args: FetchMoreOptions) => void;
  isLoading: boolean;
} {
  const [result, setResult] = useState<MappedEntityQueryResults | MappedFormEntityQueryResults>({
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

  // TODO: clean up this ternary
  const mappedResults = isForm
    ? data?.[entityNamePlural]
      ? mapQueryResultForFormFields(entityNamePlural, scope, data, schema)
      : { count: 0, results: [] }
    : data?.[entityNamePlural]
    ? mapQueryResult(entityNamePlural, scope, data, schema)
    : { count: 0, results: [] };

  function fetchMore(args: FetchMoreOptions) {
    fetchNextPage(args).then(({ data }) => {
      const mappedFetchMoreResults = isForm
        ? data?.[entityNamePlural]
          ? mapQueryResultForFormFields(entityNamePlural, scope, data, schema)
          : { count: 0, results: [] }
        : data?.[entityNamePlural]
        ? mapQueryResult(entityNamePlural, scope, data, schema)
        : { count: 0, results: [] };

      setResult((prevRows) => ({
        count: mappedFetchMoreResults.count,
        results: uniqBy(prop('_id'), [...prevRows.results, ...mappedFetchMoreResults.results]),
      }));
    });
  }

  useEffect(() => {
    setResult(mappedResults);
  }, [data]);

  return { isLoading, fetchMore, count: result.count, data: result.results };
}
