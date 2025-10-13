'use client';

import { ApolloClient, ApolloProvider, InMemoryCache, defaultDataIdFromObject, from, HttpLink } from '@apollo/client';
import type { ApolloLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { useConfig } from '../core/config/config-context';
import React, { createContext, useContext, useMemo, useState } from 'react';

type GraphQLErrorContextValue = {
  schemaErrorMessage: string | null;
  setSchemaErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
};

const GraphQLErrorContext = createContext<GraphQLErrorContextValue | undefined>(undefined);

function useGraphQLError(): GraphQLErrorContextValue {
  const ctx = useContext(GraphQLErrorContext);

  if (!ctx) {
    throw new Error('useGraphQLError must be used within GraphQLProvider');
  }

  return ctx;
}

function createErrorLink(setSchemaErrorMessage: (msg: string | null) => void): ApolloLink {
  return onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors)
      graphQLErrors.forEach(({ message, locations, path }) => {
        // eslint-disable-next-line -- intended dev-only console log
        console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
      });

    const status =
      (networkError && 'statusCode' in networkError
        ? (networkError as { statusCode?: number }).statusCode
        : undefined) ?? undefined;

    if (status === 400) {
      let message: string | null = null;

      try {
        const responseBody =
          'result' in (networkError as object) ? (networkError as { result?: unknown }).result : null;

        if (responseBody && typeof responseBody === 'object') {
          const body = responseBody as Record<string, unknown>;

          if (typeof body.message === 'string') {
            message = body.message;
          } else if (Array.isArray((body as { errors?: unknown }).errors)) {
            const errorsArray = (body as { errors?: unknown }).errors as unknown[];
            const firstError = errorsArray[0] as { message?: unknown } | undefined;

            if (firstError && typeof firstError.message === 'string') {
              message = firstError.message;
            }
          } else if (typeof (body as { error?: unknown }).error === 'string') {
            message = (body as { error?: unknown }).error as string;
          } else {
            message = JSON.stringify(body);
          }
        }
      } catch {
        // ignore parse errors
      }

      setSchemaErrorMessage(message ?? 'There is an error in your Flexkit schema (flexkit.config.ts).');
    }

    if (networkError) {
      // eslint-disable-next-line -- intended dev-only console log
      console.log(`[Network error]: ${networkError}`);
    }
  });
}

function additiveLink(currentProjectId: string, setSchemaErrorMessage: (msg: string | null) => void): ApolloLink {
  return from([
    createErrorLink(setSchemaErrorMessage),
    new HttpLink({ uri: `/api/flexkit/${currentProjectId}/graphql` }),
  ]);
}

function client(
  currentProjectId: string | undefined,
  setSchemaErrorMessage: (msg: string | null) => void
): ApolloClient<unknown> {
  return new ApolloClient({
    link: additiveLink(currentProjectId ?? '', setSchemaErrorMessage),
    cache: new InMemoryCache({
      dataIdFromObject: (responseObject) => {
        return responseObject._id ? (responseObject._id as string) : defaultDataIdFromObject(responseObject);
      },
    }),
  });
}

export function GraphQLProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { currentProjectId } = useConfig();
  const [schemaErrorMessage, setSchemaErrorMessage] = useState<string | null>(null);
  const ctx = useMemo(() => ({ schemaErrorMessage, setSchemaErrorMessage }), [schemaErrorMessage]);

  return (
    <GraphQLErrorContext.Provider value={ctx}>
      <ApolloProvider client={client(currentProjectId, setSchemaErrorMessage)}>{children}</ApolloProvider>
    </GraphQLErrorContext.Provider>
  );
}

export { useGraphQLError };
