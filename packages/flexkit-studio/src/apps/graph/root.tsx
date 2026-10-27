'use client';

import { useCallback, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { find, propEq } from 'ramda';
import { useAppContext } from '../../core/app-context';
import { useConfig } from '../../core/config/config-context';
import type { Entity } from '../../core/types';
import { useTheme } from '../../ui/theme-context';
import { GraphCanvas, type GraphCanvasStats } from './canvas';
import { buildGraphQuery, getEntityColors, getGraphEntities, graphFromRecords, type GraphNode, type GraphRecord } from './graph';

const LIMITS = [50, 200, 500, 1000];
const EMPTY_RECORDS: GraphRecord[] = [];

/**
 * Spike of the Graph app: pick an entity and a sample size, fetch the records
 * with their relationships through the project GraphQL API, and render them
 * on a sigma canvas. Measures first frame and layout time.
 */
export function Root(): JSX.Element {
  const { currentProjectId, currentProjectSchema } = useConfig();
  const { scope } = useAppContext();
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const entities = useMemo(() => getGraphEntities(currentProjectSchema), [currentProjectSchema]);
  const [entityName, setEntityName] = useState<string>('');
  const [limit, setLimit] = useState(200);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [stats, setStats] = useState<GraphCanvasStats | null>(null);
  const entity = find<Entity>(propEq(entityName, 'name'))(entities) ?? entities[0];
  const scopeField = scope || 'default';
  const query = useMemo(
    () => (entity ? buildGraphQuery({ entity, schema: currentProjectSchema, scope: scopeField }) : 'query { __typename }'),
    [entity, currentProjectSchema, scopeField]
  );
  const document = useMemo(() => gql(query), [query]);
  const { data, loading, error } = useQuery<{ [plural: string]: GraphRecord[] }>(document, {
    variables: { limit },
    skip: !entity,
  });
  const records = (entity && data?.[entity.plural]) || EMPTY_RECORDS;
  const graphData = useMemo(
    () => (entity ? graphFromRecords({ records, entity, schema: currentProjectSchema, scope: scopeField }) : { nodes: [], edges: [] }),
    [records, entity, currentProjectSchema, scopeField]
  );
  const colors = useMemo(() => getEntityColors(currentProjectSchema, theme), [currentProjectSchema, theme]);
  const handleStats = useCallback((next: GraphCanvasStats) => setStats(next), []);
  const handleSelect = useCallback((node: GraphNode | null) => setSelected(node), []);

  if (!currentProjectId) {
    return (
      <main className="fk:flex fk:h-full fk:flex-1 fk:items-center fk:justify-center fk:p-8 fk:text-sm fk:text-muted-foreground">
        Select a project to explore its graph.
      </main>
    );
  }

  return (
    <main className="fk:flex fk:h-full fk:min-h-0 fk:flex-1 fk:flex-col">
      <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-3 fk:border-b fk:px-4 fk:py-2 fk:text-sm">
        <span className="fk:font-semibold">Graph</span>
        <label className="fk:flex fk:items-center fk:gap-2">
          <span className="fk:text-muted-foreground">Start from</span>
          <select
            className="fk:h-8 fk:rounded-md fk:border fk:bg-background fk:px-2"
            onChange={(event) => setEntityName(event.target.value)}
            value={entity?.name ?? ''}
          >
            {entities.map((item) => (
              <option key={item.name} value={item.name}>
                {item.plural}
              </option>
            ))}
          </select>
        </label>
        <label className="fk:flex fk:items-center fk:gap-2">
          <span className="fk:text-muted-foreground">Sample</span>
          <select
            className="fk:h-8 fk:rounded-md fk:border fk:bg-background fk:px-2"
            onChange={(event) => setLimit(Number(event.target.value))}
            value={limit}
          >
            {LIMITS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <span className="fk:text-muted-foreground" data-testid="graph-status">
          {loading && 'Loading…'}
          {error && `Error: ${error.message}`}
          {!loading && !error && stats
            ? `${stats.nodes} nodes · ${stats.edges} edges · first frame ${stats.firstFrameMs} ms · layout ${stats.layoutMs} ms`
            : null}
          {!loading && !error && !stats && graphData.nodes.length > 0 ? 'Laying out…' : null}
        </span>
      </div>
      <div className="fk:flex fk:min-h-0 fk:flex-1">
        <div className="fk:relative fk:min-w-0 fk:flex-1 fk:bg-background">
          {graphData.nodes.length > 0 ? (
            <GraphCanvas colors={colors} data={graphData} onSelect={handleSelect} onStats={handleStats} theme={theme} />
          ) : (
            <div className="fk:flex fk:h-full fk:items-center fk:justify-center fk:text-sm fk:text-muted-foreground">
              {loading ? 'Loading records…' : 'No records with relationships to draw.'}
            </div>
          )}
        </div>
        <aside className="fk:flex fk:w-64 fk:shrink-0 fk:flex-col fk:gap-3 fk:border-l fk:p-4 fk:text-sm">
          <div className="fk:flex fk:flex-col fk:gap-1">
            <span className="fk:text-xs fk:font-medium fk:text-muted-foreground">Legend</span>
            {Object.entries(colors)
              .filter(([name]) => graphData.nodes.some((node) => node.entity === name))
              .map(([name, color]) => (
                <span className="fk:flex fk:items-center fk:gap-2" key={name}>
                  <span aria-hidden="true" className="fk:size-2.5 fk:rounded-full" style={{ backgroundColor: color }} />
                  {name}
                  <span className="fk:ml-auto fk:text-muted-foreground">
                    {graphData.nodes.filter((node) => node.entity === name).length}
                  </span>
                </span>
              ))}
          </div>
          <div className="fk:flex fk:flex-col fk:gap-1">
            <span className="fk:text-xs fk:font-medium fk:text-muted-foreground">Selected</span>
            {selected ? (
              <>
                <span className="fk:font-medium">{selected.label}</span>
                <span className="fk:text-muted-foreground">{selected.entity}</span>
                <span className="fk:break-all fk:font-mono fk:text-xs fk:text-muted-foreground">{selected.id}</span>
              </>
            ) : (
              <span className="fk:text-muted-foreground">Click a node.</span>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
