import { useEffect, useState } from 'react';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import { useLazyQuery, gql } from '@apollo/client';
import { getEntityQuery, mapQueryResult, mapQueryResultForFormFields } from './queries';
import type { EntityList, MappedEntityQueryResults, MappedFormEntityQueryResults, UseEntityQueryParams } from './types';

export function useEntityQuery({
  entityName,
  jsonSchema,
  scope,
  variables,
  isForm,
}: UseEntityQueryParams): [boolean, MappedEntityQueryResults | MappedFormEntityQueryResults] {
  const [result, setResult] = useState<MappedEntityQueryResults | MappedFormEntityQueryResults>({
    count: 0,
    results: [],
  });
  const [lazyQuery, setLazyQuery] = useState(gql`
    query {
      __schema {
        queryType {
          fields {
            name
          }
        }
      }
    }
  `);
  const [getData, { loading, data }] = useLazyQuery(lazyQuery);

  useEffect(() => {
    if (jsonSchema.length === 0) return;

    const entityQuery = getEntityQuery(entityName, scope, jsonSchema);

    entityQuery.query &&
      setLazyQuery(gql`
        ${entityQuery.query}
      `);

    entityQuery.query && void getData({ variables });

    if (data) {
      const mappedResults = isForm
        ? mapQueryResultForFormFields(entityName, scope, data as EntityList, jsonSchema)
        : mapQueryResult(entityName, scope, data as EntityList, jsonSchema);
      setResult(mappedResults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- some deps intentionally left out to prevent infinite loop
  }, [jsonSchema, scope, JSON.stringify(variables), data, lazyQuery]);

  return [loading, result];
}
