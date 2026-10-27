'use client';

import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { getDisplayAttribute } from '../../core/get-display-attribute';
import { useSearch } from '../../core/use-search';
import type { Entity, SearchRequestProps } from '../../core/types';
import {
  Checkbox,
  Input,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarPanel,
  SidebarRail,
} from '../../ui';
import { buildTotalsQuery, getEntityLabel, getTotalEntities } from './graph';

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_HITS_PER_ENTITY = 5;

export interface GraphSidebarProps {
  projectId: string;
  entities: Entity[];
  colors: { [entity: string]: string };
  /** Nodes on the canvas per entity. */
  onCanvas: { [entity: string]: number };
  hiddenEntities: string[];
  onStart: (entity: Entity) => void;
  onHit: (entityName: string, id: string) => void;
  onToggleEntity: (entityName: string) => void;
}

function buildSearchRequest(entities: Entity[], q: string): SearchRequestProps | null {
  const trimmed = q.trim();

  if (!trimmed || entities.length === 0) {
    return null;
  }

  return {
    searchRequests: { searches: entities.map((entity) => ({ collection: entity.plural })) },
    commonParams: { q: trimmed, limit: SEARCH_HITS_PER_ENTITY },
  };
}

/** Count-store totals per entity for the "Start from" list; absent for space-bound entities. */
function useTotals(entities: Entity[]): { [plural: string]: number } {
  const countable = useMemo(() => getTotalEntities(entities), [entities]);
  const document = useMemo(() => gql(countable.length > 0 ? buildTotalsQuery(countable) : 'query GraphTotals { __typename }'), [countable]);
  const { data } = useQuery<{ [field: string]: number }>(document, { skip: countable.length === 0 });

  return useMemo(
    () =>
      Object.fromEntries(
        countable
          .map((entity) => [entity.plural, data?.[`${entity.plural}Total`]] as const)
          .filter((pair): pair is readonly [string, number] => typeof pair[1] === 'number')
      ),
    [countable, data]
  );
}

/**
 * Search a record to add it to the canvas, start from a whole entity, and the
 * legend of what is on the canvas with a switch per entity.
 */
export function GraphSidebar({
  projectId,
  entities,
  colors,
  onCanvas,
  hiddenEntities,
  onStart,
  onHit,
  onToggleEntity,
}: GraphSidebarProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const searchable = useMemo(
    () => entities.filter((entity) => entity.attributes.some((attribute) => attribute.searchable)),
    [entities]
  );
  const request = useMemo(() => buildSearchRequest(searchable, debouncedQuery), [searchable, debouncedQuery]);
  const { results, isLoading } = useSearch(projectId, request);
  const totals = useTotals(entities);
  const entityByName = useMemo(() => new Map(entities.map((entity) => [entity.name, entity])), [entities]);
  const onCanvasEntities = Object.keys(onCanvas).sort();

  return (
    <SidebarPanel collapsible="icon" variant="inset">
      <SidebarContent>
        <SidebarGroup className="fk:group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Add a record</SidebarGroupLabel>
          <div className="fk:relative">
            <SearchIcon className="fk:pointer-events-none fk:absolute fk:left-2 fk:top-1/2 fk:size-4 fk:-translate-y-1/2 fk:text-muted-foreground" />
            <Input
              aria-label="Search records to add to the canvas"
              className="fk:h-8 fk:bg-background fk:pl-8 fk:shadow-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchable.length > 0 ? 'Search records…' : 'No searchable entity'}
              disabled={searchable.length === 0}
              value={query}
            />
          </div>
          {request ? (
            <ul className="fk:mt-2 fk:flex fk:flex-col fk:gap-0.5" data-testid="graph-search-results">
              {results.map((hit) => {
                const entity = entityByName.get(hit._entityName);
                const label = hit[getDisplayAttribute(entity)?.name ?? ''];

                return (
                  <li key={`${hit._entityName}:${hit._id}`}>
                    <button
                      className="fk:flex fk:w-full fk:items-center fk:gap-2 fk:rounded-md fk:px-2 fk:py-1.5 fk:text-left fk:text-sm fk:hover:bg-sidebar-accent"
                      onClick={() => onHit(hit._entityName, hit._id)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className="fk:size-2.5 fk:shrink-0 fk:rounded-full"
                        style={{ backgroundColor: colors[hit._entityName] ?? '#71717a' }}
                      />
                      <span className="fk:min-w-0 fk:flex-1 fk:truncate">{String(label ?? hit._id)}</span>
                      <PlusIcon className="fk:size-3.5 fk:shrink-0 fk:text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
              {!isLoading && results.length === 0 ? (
                <li className="fk:px-2 fk:py-1.5 fk:text-sm fk:text-muted-foreground">Nothing found</li>
              ) : null}
            </ul>
          ) : null}
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Start from</SidebarGroupLabel>
          <SidebarMenu>
            {entities.map((entity) => (
              <SidebarMenuItem key={entity.name}>
                <SidebarMenuButton onClick={() => onStart(entity)} tooltip={getEntityLabel(entity)}>
                  <span
                    aria-hidden="true"
                    className="fk:size-2.5 fk:shrink-0 fk:rounded-full"
                    style={{ backgroundColor: colors[entity.name] ?? '#71717a' }}
                  />
                  <span className="fk:truncate">{getEntityLabel(entity)}</span>
                  {totals[entity.plural] !== undefined ? (
                    <span className="fk:ml-auto fk:text-xs fk:text-muted-foreground">
                      {totals[entity.plural]?.toLocaleString()}
                    </span>
                  ) : null}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {onCanvasEntities.length > 0 ? (
          <SidebarGroup className="fk:group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>On canvas</SidebarGroupLabel>
            <ul className="fk:flex fk:flex-col" data-testid="graph-legend">
              {onCanvasEntities.map((name) => {
                const entity = entityByName.get(name);
                const checked = !hiddenEntities.includes(name);
                const id = `graph-legend-${name}`;

                return (
                  <li className="fk:flex fk:h-8 fk:items-center fk:gap-2 fk:px-2 fk:text-sm" key={name}>
                    <span
                      aria-hidden="true"
                      className="fk:size-2.5 fk:shrink-0 fk:rounded-full"
                      style={{ backgroundColor: colors[name] ?? '#71717a', opacity: checked ? 1 : 0.35 }}
                    />
                    <label className="fk:min-w-0 fk:flex-1 fk:cursor-pointer fk:truncate" htmlFor={id}>
                      {entity ? getEntityLabel(entity) : name}
                    </label>
                    <span className="fk:text-xs fk:text-muted-foreground">{onCanvas[name]?.toLocaleString()}</span>
                    <Checkbox
                      aria-label={`Show ${entity ? getEntityLabel(entity) : name}`}
                      checked={checked}
                      id={id}
                      onCheckedChange={() => onToggleEntity(name)}
                    />
                  </li>
                );
              })}
            </ul>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarRail />
    </SidebarPanel>
  );
}
