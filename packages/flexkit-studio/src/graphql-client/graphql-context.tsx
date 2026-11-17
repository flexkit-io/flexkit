'use client';

import type { JSX } from 'react';
import { ApolloClient, InMemoryCache, defaultDataIdFromObject, from, HttpLink } from '@apollo/client';
import type { ApolloLink } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors, CombinedProtocolErrors } from '@apollo/client/errors';
import { toast } from 'sonner';
import { getGraphQLSchemaMismatchMessage, getServerError } from './error-utils';
import { classifyBadRequest, getRoleRefusalMessage, ROLE_REFUSAL_TOAST_ID } from './role-refusal';
import { SchemaErrorHolders } from './schema-error-holders';
import { useConfig } from '../core/config/config-context';
import React, { createContext, useContext, useMemo, useState } from 'react';

const ApolloProviderCompat = ApolloProvider as unknown as React.ComponentType<{
  children?: React.ReactNode;
  client: ApolloClient;
}>;

type GraphQLErrorContextValue = {
  schemaErrorMessage: string | null;
  setSchemaErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  /** The failing queries that hold the banner's message (see `SchemaErrorHolders`). */
  schemaErrorHolders: SchemaErrorHolders;
};

const GraphQLErrorContext = createContext<GraphQLErrorContextValue | undefined>(undefined);

function useGraphQLError(): GraphQLErrorContextValue {
  const ctx = useContext(GraphQLErrorContext);

  if (!ctx) {
    throw new Error('useGraphQLError must be used within GraphQLProvider');
  }

  return ctx;
}

/**
 * Context flag for operations the user writes themselves (the Graph app's
 * Query view): any error there, a mismatch or a 400, is a typo, not a
 * deployment that drifted from the local schema, so it must not raise the
 * schema banner. The caller shows the error itself.
 */
export const USER_QUERY_CONTEXT = { userQuery: true } as const;

function createErrorLink(setSchemaErrorMessage: (msg: string | null) => void): ApolloLink {
  return new ErrorLink(({ error, operation }) => {
    if (operation.getContext().userQuery === true) {
      return;
    }

    // A refusal of the member's role is not a schema problem: say what the
    // server said and leave the banner (and the table under it) alone.
    const roleRefusalMessage = getRoleRefusalMessage(error);

    if (roleRefusalMessage) {
      // Kept up longer than a passing notice: after a refused list query the table is simply
      // empty, and this sentence is the only thing that says why.
      toast.error(roleRefusalMessage, { duration: 12_000, id: ROLE_REFUSAL_TOAST_ID });

      return;
    }

    const schemaMismatchMessage = getGraphQLSchemaMismatchMessage(error);

    if (schemaMismatchMessage) {
      setSchemaErrorMessage(schemaMismatchMessage);

      return;
    }

    if (CombinedGraphQLErrors.is(error)) {
      error.errors.forEach(({ message, locations, path }) => {
        console.warn(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
      });
    } else if (CombinedProtocolErrors.is(error)) {
      error.errors.forEach(({ message, extensions }) => {
        console.warn(`[Protocol error]: Message: ${message}, Extensions: ${JSON.stringify(extensions)}`);
      });
    }

    const serverError = getServerError(error);

    if (serverError?.statusCode === 400) {
      setSchemaErrorMessage(classifyBadRequest(serverError.bodyText).message);
    }

    if (serverError) {
      console.warn(`[Network error]: ${serverError.message}`);

      return;
    }

    if (error) {
      console.warn(`[Network error]: ${error.message}`);
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
  const [schemaErrorHolders] = useState(() => new SchemaErrorHolders());
  const ctx = useMemo(
    () => ({ schemaErrorMessage, setSchemaErrorMessage, schemaErrorHolders }),
    [schemaErrorMessage, schemaErrorHolders]
  );
  const apolloClient = useMemo(() => client(currentProjectId, setSchemaErrorMessage), [currentProjectId]);

  return (
    <GraphQLErrorContext.Provider value={ctx}>
      <ApolloProviderCompat client={apolloClient}>{children}</ApolloProviderCompat>
    </GraphQLErrorContext.Provider>
  );
}

export { useGraphQLError };
