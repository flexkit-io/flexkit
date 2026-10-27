'use client';

import { useEffect, useState } from 'react';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { buildClientSchema, getIntrospectionQuery } from 'graphql';
import type { GraphQLSchema, IntrospectionQuery } from 'graphql';

/** One introspection per deployed schema (project id + schema hash), so a deployment while the Studio is open refreshes it. */
const schemaCache = new Map<string, Promise<GraphQLSchema>>();

function introspect(client: ReturnType<typeof useApolloClient>, cacheKey: string): Promise<GraphQLSchema> {
  const cached = schemaCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const pending = client
    .query<IntrospectionQuery>({ query: gql(getIntrospectionQuery()), fetchPolicy: 'network-only' })
    .then((result) => {
      if (!result.data) {
        throw new Error('The schema could not be introspected.');
      }

      return buildClientSchema(result.data);
    });
  pending.catch(() => schemaCache.delete(cacheKey));
  schemaCache.set(cacheKey, pending);

  return pending;
}

/**
 * The project's GraphQL schema, for completion and validation in the editor;
 * null until loaded. Re-introspected when the deployed schema hash changes.
 */
export function useGraphQLSchema(
  projectId: string | undefined,
  schemaHash: string | null | undefined
): GraphQLSchema | null {
  const client = useApolloClient();
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);

  useEffect(() => {
    if (!projectId) {
      return undefined;
    }

    let cancelled = false;
    introspect(client, `${projectId}:${schemaHash ?? ''}`)
      .then((loaded) => {
        if (!cancelled) {
          setSchema(loaded);
        }
      })
      .catch(() => {
        // The editor works without completion.
      });

    return () => {
      cancelled = true;
    };
  }, [client, projectId, schemaHash]);

  return schema;
}
