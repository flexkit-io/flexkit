'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { ChevronDownIcon, LoaderCircleIcon, PlayIcon } from 'lucide-react';
import { getLocalStorage } from '../../core/local-storage';
import type { Entity } from '../../core/types';
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../ui';
import { QueryEditor } from './query-editor';
import { exampleQueries, queryStorageKey, tableFromResult, TABLE_ROW_LIMIT, type QueryResult } from './query';
import { useGraphQLSchema } from './use-graphql-schema';

/** What a run of a query produced, for the pane's footer. */
export interface QueryRun {
  data: QueryResult | null;
  error: string | null;
  elapsedMs: number;
  /** Nodes and edges the result added to the canvas. */
  nodes: number;
  edges: number;
}

export interface QueryPaneProps {
  projectId: string;
  schema: Entity[];
  scope: string;
  theme: 'light' | 'dark';
  isRunning: boolean;
  onRun: (query: string, options: { append: boolean }) => Promise<QueryRun>;
}

type ResultTab = 'graph' | 'table' | 'json';

function readStoredQuery(projectId: string): string {
  try {
    return getLocalStorage()?.getItem(queryStorageKey(projectId)) ?? '';
  } catch {
    return '';
  }
}

function storeQuery(projectId: string, query: string): void {
  try {
    getLocalStorage()?.setItem(queryStorageKey(projectId), query);
  } catch {
    // Storage may be blocked; the query just is not remembered.
  }
}

/**
 * The Query view: a GraphQL editor whose result is drawn on the canvas.
 * Every object with an id becomes a node, every nested selection a
 * relationship; the same result is also shown as a table and as JSON.
 */
export function QueryPane({ projectId, schema, scope, theme, isRunning, onRun }: QueryPaneProps): JSX.Element {
  const graphqlSchema = useGraphQLSchema(projectId);
  const examples = useMemo(() => exampleQueries(schema, scope), [schema, scope]);
  const [query, setQuery] = useState(() => readStoredQuery(projectId) || examples[0]?.query || '');
  const [append, setAppend] = useState(false);
  const [tab, setTab] = useState<ResultTab>('graph');
  const [run, setRun] = useState<QueryRun | null>(null);
  const table = useMemo(() => (run?.data ? tableFromResult(run.data, scope) : null), [run, scope]);

  useEffect(() => {
    storeQuery(projectId, query);
  }, [projectId, query]);

  const execute = async (): Promise<void> => {
    if (!query.trim() || isRunning) {
      return;
    }

    setRun(await onRun(query, { append }));
  };

  return (
    <section
      aria-label="Query"
      className="fk:flex fk:w-[26rem] fk:shrink-0 fk:flex-col fk:border-r fk:bg-background"
      data-testid="graph-query-pane"
    >
      <div className="fk:flex fk:h-12 fk:shrink-0 fk:items-center fk:gap-2 fk:border-b fk:pl-4 fk:pr-3">
        <span className="fk:text-sm fk:font-semibold">Query</span>
        <div className="fk:ml-auto fk:flex fk:items-center fk:gap-1.5">
          {examples.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="fk:h-8" size="sm" variant="outline">
                  Examples
                  <ChevronDownIcon className="fk:size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="fk:max-h-80 fk:overflow-y-auto">
                {examples.map((example) => (
                  <DropdownMenuItem key={example.title} onSelect={() => setQuery(example.query)}>
                    {example.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button className="fk:h-8" disabled={isRunning || !query.trim()} onClick={() => void execute()} size="sm">
            {isRunning ? (
              <LoaderCircleIcon className="fk:size-3.5 fk:animate-spin" />
            ) : (
              <PlayIcon className="fk:size-3.5" />
            )}
            Run
          </Button>
        </div>
      </div>
      <div className="fk:min-h-0 fk:flex-1">
        <QueryEditor
          ariaLabel="GraphQL query"
          onChange={setQuery}
          onRun={() => void execute()}
          schema={graphqlSchema}
          theme={theme}
          value={query}
        />
      </div>
      <Tabs
        className="fk:flex fk:max-h-[45%] fk:shrink-0 fk:flex-col fk:gap-0 fk:border-t"
        onValueChange={(value) => setTab(value as ResultTab)}
        value={tab}
      >
        <div className="fk:flex fk:h-11 fk:shrink-0 fk:items-center fk:gap-3 fk:px-3">
          <TabsList>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
          <span className="fk:ml-auto fk:truncate fk:text-xs fk:text-muted-foreground" data-testid="graph-query-stats">
            {run && !run.error
              ? `${run.nodes.toLocaleString()} ${run.nodes === 1 ? 'node' : 'nodes'} · ${run.edges.toLocaleString()} ${run.edges === 1 ? 'relationship' : 'relationships'} · ${run.elapsedMs.toLocaleString()} ms`
              : null}
          </span>
        </div>
        {run?.error ? (
          <pre
            className="fk:m-3 fk:mt-0 fk:max-h-40 fk:shrink-0 fk:overflow-auto fk:whitespace-pre-wrap fk:rounded-md fk:border fk:border-destructive/40 fk:bg-destructive/5 fk:p-2 fk:text-xs fk:text-destructive"
            data-testid="graph-query-error"
          >
            {run.error}
          </pre>
        ) : null}
        <div className="fk:min-h-0 fk:overflow-auto">
          <TabsContent
            className="fk:flex fk:flex-col fk:gap-3 fk:px-3 fk:pb-3 fk:text-xs fk:text-muted-foreground"
            value="graph"
          >
            <span>
              Every object with an <code className="fk:font-mono">_id</code> under an entity field becomes a node; a
              nested relationship selection becomes a line between them.
            </span>
            <div className="fk:flex fk:items-center fk:gap-2">
              <Checkbox
                checked={append}
                id="graph-query-append"
                onCheckedChange={(checked) => setAppend(checked === true)}
              />
              <Label className="fk:text-xs fk:font-normal" htmlFor="graph-query-append">
                Add to the current canvas instead of replacing it
              </Label>
            </div>
          </TabsContent>
          <TabsContent className="fk:px-3 fk:pb-3" value="table">
            {table && table.columns.length > 0 ? (
              <div className="fk:flex fk:flex-col fk:gap-1">
                <div className="fk:overflow-x-auto fk:rounded-md fk:border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {table.columns.map((column) => (
                          <TableHead className="fk:h-8 fk:text-xs" key={column}>
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table.rows.map((row, index) => (
                        <TableRow key={row._id ?? index}>
                          {table.columns.map((column) => (
                            <TableCell
                              className="fk:max-w-56 fk:truncate fk:py-1.5 fk:text-xs"
                              key={column}
                              title={row[column]}
                            >
                              {row[column]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {table.total > TABLE_ROW_LIMIT ? (
                  <span className="fk:text-xs fk:text-muted-foreground">
                    First {TABLE_ROW_LIMIT.toLocaleString()} of {table.total.toLocaleString()} records.
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="fk:text-xs fk:text-muted-foreground">Run a query to see its records.</span>
            )}
          </TabsContent>
          <TabsContent className="fk:px-3 fk:pb-3" value="json">
            {run?.data ? (
              <pre className="fk:overflow-auto fk:rounded-md fk:border fk:bg-muted/40 fk:p-2 fk:font-mono fk:text-xs">
                {JSON.stringify(run.data, null, 2)}
              </pre>
            ) : (
              <span className="fk:text-xs fk:text-muted-foreground">Run a query to see its response.</span>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
