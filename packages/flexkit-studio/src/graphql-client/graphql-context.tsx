'use client';

// @ts-expect-error -- this is an ECMAScript module
import { ApolloClient, ApolloProvider, InMemoryCache, defaultDataIdFromObject, from, HttpLink } from '@apollo/client';
// @ts-expect-error -- this is an ECMAScript module
import type { ApolloLink } from '@apollo/client';
// @ts-expect-error -- this is an ECMAScript module
import { onError } from '@apollo/client/link/error';
import { useConfig } from '../core/config/config-context';

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) => {
      // eslint-disable-next-line -- intended dev-only console log
      console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);
    });

  if (networkError) {
    // eslint-disable-next-line -- intended dev-only console log
    console.log(`[Network error]: ${networkError}`);
  }
});

function additiveLink(currentProjectId: string): ApolloLink {
  return from([errorLink, new HttpLink({ uri: `/api/flexkit/${currentProjectId}/graphql` })]);
}

function client(currentProjectId: string | undefined): ApolloClient<unknown> {
  return new ApolloClient({
    link: additiveLink(currentProjectId ?? ''),
    cache: new InMemoryCache({
      dataIdFromObject: (responseObject) => {
        return responseObject._id ? (responseObject._id as string) : defaultDataIdFromObject(responseObject);
      },
    }),
  });
}

export function GraphQLProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { currentProjectId } = useConfig();

  return <ApolloProvider client={client(currentProjectId)}>{children}</ApolloProvider>;
}
