'use client';

import { useMemo } from 'react';
import { createGraphiQLFetcher } from '@graphiql/toolkit';
import { useConfig } from '@flexkit/studio';
import { GraphiQL } from './components/graphiql';
import '@graphiql/react/style.css';
import '@graphiql/plugin-history/style.css';

const DEFAULT_QUERY = `# Welcome to Flexkit Explorer
#
# Explorer is an in-browser tool for writing, validating, and
# testing GraphQL queries against your Flexkit datasource.
#
# Type queries into this side of the screen, and you will see intelligent
# typeaheads aware of the current GraphQL schema and live syntax and
# validation errors highlighted within the text.
#
# GraphQL queries typically start with a "{" character. Lines that start
# with a # are ignored.
#
# An example GraphQL query might look like:
#
#     {
#       field(arg: "value") {
#         subField
#       }
#     }
#
# Keyboard shortcuts:
#
#   Prettify query:  Shift-Ctrl-P (or press the prettify button)
#
#  Merge fragments:  Shift-Ctrl-M (or press the merge button)
#
#        Run Query:  Ctrl-Enter (or press the play button)
#
#    Auto Complete:  Ctrl-Space (or just start typing)
#`;

export function Root(): JSX.Element {
  const { currentProjectId } = useConfig();
  const url = `/api/flexkit/${currentProjectId}/graphql`;
  const fetcher = useMemo(() => createGraphiQLFetcher({ url }), [url]);

  return <GraphiQL fetcher={fetcher} forcedTheme="light" defaultQuery={DEFAULT_QUERY} />;
}
