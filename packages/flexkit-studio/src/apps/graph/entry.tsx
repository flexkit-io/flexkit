'use client';

import type { JSX } from 'react';
import { Waypoints as WaypointsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../../core/config/config-context';
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui';
import { getEntity, getRelationshipAttributes, graphPath } from './graph';

/**
 * "Open in Graph" for a Desk list: the selected records, or a sample of the
 * entity when nothing is selected. Hidden for entities without relationships.
 */
export function EntityGraphButton({ entityName, selectedIds }: { entityName: string; selectedIds: string[] }): JSX.Element | null {
  const { currentProjectId, currentProjectSchema } = useConfig();
  const navigate = useNavigate();
  const entity = getEntity(currentProjectSchema, entityName);

  if (!currentProjectId || !entity || getRelationshipAttributes(entity).length === 0) {
    return null;
  }

  const label = selectedIds.length > 0 ? `Open ${selectedIds.length} in Graph` : 'Open in Graph';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className="fk:mr-2 fk:h-8"
          onClick={() => navigate(graphPath(currentProjectId, { entity: entityName, ids: selectedIds }))}
          size="sm"
          variant="outline"
        >
          <WaypointsIcon className="fk:size-4" strokeWidth={1.5} />
          {selectedIds.length > 0 ? `Graph (${selectedIds.length})` : 'Graph'}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {selectedIds.length > 0 ? 'Show the selected records and their relationships' : 'Explore these records as a graph'}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * "View in Graph" in a record drawer: the record expanded one hop. The drawer
 * is mounted outside any app, so the tooltip brings its own provider.
 */
export function RecordGraphButton({
  entityName,
  recordId,
  onNavigate,
}: {
  entityName: string;
  recordId: string;
  onNavigate?: () => void;
}): JSX.Element | null {
  const { currentProjectId, currentProjectSchema } = useConfig();
  const navigate = useNavigate();
  const entity = getEntity(currentProjectSchema, entityName);

  if (!currentProjectId || !entity || !recordId || getRelationshipAttributes(entity).length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="View in Graph"
            className="fk:h-9 fk:w-9"
            onClick={() => {
              navigate(graphPath(currentProjectId, { entity: entityName, ids: [recordId] }));
              onNavigate?.();
            }}
            size="icon"
            variant="outline"
          >
            <WaypointsIcon className="fk:size-4" strokeWidth={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View in Graph</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
