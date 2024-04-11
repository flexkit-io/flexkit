import { useEffect, useState } from 'react';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import { useQuery, gql } from '@apollo/client';
import { getEntityQuery, mapQueryResult, mapQueryResultForFormFields } from './queries';
import type {
  EntityQueryAggregate,
  EntityQueryResults,
  MappedEntityQueryResults,
  MappedFormEntityQueryResults,
  UseEntityQueryParams,
} from './types';

export function useEntityQuery({
  entityNamePlural,
  schema,
  scope,
  variables,
  isForm,
}: UseEntityQueryParams): [boolean, MappedEntityQueryResults | MappedFormEntityQueryResults] {
  const [result, setResult] = useState<MappedEntityQueryResults | MappedFormEntityQueryResults>({
    count: 0,
    results: [],
  });
  const entityQuery = getEntityQuery(entityNamePlural, scope, schema);
  const { loading, data } = useQuery(
    gql`
      ${entityQuery.query}
    `,
    { variables }
  );

  useEffect(() => {
    if (schema.length === 0) return;

    const entityData = data as (EntityQueryAggregate & EntityQueryResults) | undefined;

    if (entityData?.[entityNamePlural]) {
      const mappedResults = isForm
        ? mapQueryResultForFormFields(entityNamePlural, scope, entityData, schema)
        : mapQueryResult(entityNamePlural, scope, entityData, schema);
      setResult(mappedResults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- some deps intentionally left out to prevent infinite loop
  }, [schema, scope, JSON.stringify(variables), data]);

  return [loading, result];
}
