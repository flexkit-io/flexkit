'use client';

import { useMemo } from 'react';
import { createGraphiQLFetcher } from '@graphiql/toolkit';
import { useConfig } from '@flexkit/studio';
import { GraphiQL } from './components/graphiql';
import '@graphiql/react/dist/style.css';

export function Root(): JSX.Element {
  const { currentProjectId } = useConfig();
  const url = `https://${currentProjectId}.api.flexkit.io/graphql`;
  const fetcher = useMemo(() => createGraphiQLFetcher({ url }), [url]);

  return <GraphiQL fetcher={fetcher} />;
}
