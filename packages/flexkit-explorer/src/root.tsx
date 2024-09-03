'use client';

import { useMemo } from 'react';
// @ts-expect-error -- this is an ECMAScript module
import { createGraphiQLFetcher } from '@graphiql/toolkit';
import { GraphiQL } from './components/graphiql';
import '@graphiql/react/dist/style.css';

export function Root(): JSX.Element {
  const url = 'https://abcdefghij.api.flexkit.io/graphql';
  const fetcher = useMemo(() => createGraphiQLFetcher({ url }), [url]);

  return <GraphiQL fetcher={fetcher} />;
}
