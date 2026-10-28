'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { ChevronDownIcon, LoaderCircleIcon, PlayIcon } from 'lucide-react';
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
import { readComposerDraft, writeComposerDraft } from '../ai/agent/composer-draft';
import { QueryEditor } from './query-editor';
import {
  exampleQueries,
  queryStorageKey,
  stripTypename,
  tableFromResult,
  TABLE_ROW_LIMIT,
  type QueryRun,
} from './query';
import { useGraphQLSchema } from './use-graphql-schema';

export interface QueryPaneProps {
  projectId: string;
  /** The deployed schema's hash; a change re-introspects the schema for the editor. */
  schemaHash: string | null;
  schema: Entity[];
  scope: string;
  theme: 'light' | 'dark';
  isRunning: boolean;
  /** Kept mounted while the Explore view shows, so the last run survives the switch. */
  hidden: boolean;
  onRun: (query: string, options: { append: boolean }) => Promise<QueryRun>;
}

type ResultTab = 'graph' | 'table' | 'json';

/**
 * The Query view: a GraphQL editor whose result is drawn on the canvas.
 * Every object with an id becomes a node, every nested selection a
 * relationship; the same result is also shown as a table and as JSON.
 */
export function QueryPane({
  projectId,
  schemaHash,
  schema,
  scope,
  theme,
  isRunning,
  hidden,
  onRun,
}: QueryPaneProps): JSX.Element {
  // The schema is introspected once the view has been opened, not on every Graph visit.
  const [opened, setOpened] = useState(!hidden);
  const graphqlSchema = useGraphQLSchema(opened ? projectId : undefined, schemaHash);
  const examples = useMemo(() => exampleQueries(schema, scope), [schema, scope]);
  const [query, setQuery] = useState(() => readComposerDraft(queryStorageKey(projectId)) || examples[0]?.query || '');
  // The schema may arrive after the pane mounts: the first example fills an
  // editor that started empty, once, so clearing it later is left alone.
  const seededRef = useRef(query !== '');
  const [append, setAppend] = useState(false);
  const [tab, setTab] = useState<ResultTab>('graph');
  const [run, setRun] = useState<QueryRun | null>(null);
  // Built for the open tab only: a large result is not tabulated or pretty-printed unseen.
  const table = useMemo(
    () => (tab === 'table' && run?.data ? tableFromResult(run.data, scope) : null),
    [tab, run, scope]
  );
  const json = useMemo(
    () => (tab === 'json' && run?.data ? JSON.stringify(stripTypename(run.data), null, 2) : null),
    [tab, run]
  );

  useEffect(() => {
    if (!hidden) {
      setOpened(true);
    }
  }, [hidden]);

  useEffect(() => {
    const [first] = examples;

    if (!seededRef.current && first) {
      seededRef.current = true;
      setQuery((current) => current || first.query);
    }
  }, [examples]);

  useEffect(() => {
    writeComposerDraft(queryStorageKey(projectId), query);
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
      className={`fk:w-[26rem] fk:shrink-0 fk:flex-col fk:border-r fk:bg-background ${hidden ? 'fk:hidden' : 'fk:flex'}`}
      data-testid="graph-query-pane"
      hidden={hidden}
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
                  <DropdownMenuItem key={example.entity} onSelect={() => setQuery(example.query)}>
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
                        <TableRow key={`${row._id ?? ''}-${index}`}>
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
              <span className="fk:text-xs fk:text-muted-foreground">
                {run?.data ? 'The response has no rows to show.' : 'Run a query to see its records.'}
              </span>
            )}
          </TabsContent>
          <TabsContent className="fk:px-3 fk:pb-3" value="json">
            {json ? (
              <pre className="fk:overflow-auto fk:rounded-md fk:border fk:bg-muted/40 fk:p-2 fk:font-mono fk:text-xs">
                {json}
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
