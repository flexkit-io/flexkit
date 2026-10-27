'use client';

import { useEffect, useState } from 'react';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { buildClientSchema, getIntrospectionQuery } from 'graphql';
import type { GraphQLSchema, IntrospectionQuery } from 'graphql';

/** One introspection per project per session; the schema only changes with a deployment. */
const schemaCache = new Map<string, Promise<GraphQLSchema>>();

function introspect(client: ReturnType<typeof useApolloClient>, projectId: string): Promise<GraphQLSchema> {
  const cached = schemaCache.get(projectId);

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
  pending.catch(() => schemaCache.delete(projectId));
  schemaCache.set(projectId, pending);

  return pending;
}

/** The project's GraphQL schema, for completion and validation in the editor; null until loaded. */
export function useGraphQLSchema(projectId: string | undefined): GraphQLSchema | null {
  const client = useApolloClient();
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);

  useEffect(() => {
    if (!projectId) {
      return undefined;
    }

    let cancelled = false;
    introspect(client, projectId)
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
  }, [client, projectId]);

  return schema;
}
