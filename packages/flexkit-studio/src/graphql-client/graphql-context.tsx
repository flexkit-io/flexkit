'use client';

import { ApolloClient, InMemoryCache, defaultDataIdFromObject, from, HttpLink } from '@apollo/client';
import type { ApolloLink } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors, CombinedProtocolErrors } from '@apollo/client/errors';
import { getServerError, parseErrorBody } from './error-utils';
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
  return new ErrorLink(({ error }) => {
    if (CombinedGraphQLErrors.is(error)) {
      error.errors.forEach(({ message, locations, path }) => {
        console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
      });
    } else if (CombinedProtocolErrors.is(error)) {
      error.errors.forEach(({ message, extensions }) => {
        console.log(`[Protocol error]: Message: ${message}, Extensions: ${JSON.stringify(extensions)}`);
      });
    }

    const serverError = getServerError(error);

    if (serverError?.statusCode === 400) {
      const responseBody = parseErrorBody<Record<string, unknown>>(serverError.bodyText);
      let message: string | null = null;

      if (responseBody && typeof responseBody === 'object') {
        if (typeof responseBody.message === 'string') {
          message = responseBody.message;
        } else if (Array.isArray((responseBody as { errors?: unknown }).errors)) {
          const errorsArray = (responseBody as { errors?: unknown }).errors as unknown[];
          const firstError = errorsArray[0] as { message?: unknown } | undefined;

          if (firstError && typeof firstError.message === 'string') {
            message = firstError.message;
          }
        } else if (typeof (responseBody as { error?: unknown }).error === 'string') {
          message = (responseBody as { error?: unknown }).error as string;
        } else {
          message = JSON.stringify(responseBody);
        }
      } else {
        message = serverError.bodyText;
      }

      setSchemaErrorMessage(message ?? 'There is an error in your Flexkit schema (flexkit.config.ts).');
    }

    if (serverError) {
      console.log(`[Network error]: ${serverError.message}`);

      return;
    }

    if (error) {
      console.log(`[Network error]: ${error.message}`);
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
): ApolloClient {
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
