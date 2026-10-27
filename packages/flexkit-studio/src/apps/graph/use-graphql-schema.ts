'use client';

import { useEffect, useState } from 'react';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { buildClientSchema, getIntrospectionQuery } from 'graphql';
import type { GraphQLSchema, IntrospectionQuery } from 'graphql';
import { USER_QUERY_CONTEXT } from '../../graphql-client/graphql-context';

/** One introspection per project, keyed by its deployed schema hash so a deployment while the Studio is open refreshes it. */
const schemaCache = new Map<string, { hash: string; schema: Promise<GraphQLSchema> }>();

function introspect(client: ReturnType<typeof useApolloClient>, projectId: string, hash: string): Promise<GraphQLSchema> {
  const cached = schemaCache.get(projectId);

  if (cached && cached.hash === hash) {
    return cached.schema;
  }

  // Not cached by Apollo: the introspection tree is large and only this hook reads it.
  const schema = client
    .query<IntrospectionQuery>({
      query: gql(getIntrospectionQuery()),
      fetchPolicy: 'no-cache',
      context: USER_QUERY_CONTEXT,
    })
    .then((result) => {
      if (!result.data) {
        throw new Error('The schema could not be introspected.');
      }

      return buildClientSchema(result.data);
    });
  schema.catch(() => {
    if (schemaCache.get(projectId)?.schema === schema) {
      schemaCache.delete(projectId);
    }
  });
  schemaCache.set(projectId, { hash, schema });

  return schema;
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
    introspect(client, projectId, schemaHash ?? '')
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
