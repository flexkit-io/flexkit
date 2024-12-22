'use client';

import { useCallback, useState } from 'react';
import { find, propEq } from 'ramda';
import type { ColumnDef } from '@tanstack/react-table';
import { useAppContext, useAppDispatch } from '../core/app-context';
import DrawerModal from '../ui/components/drawer-modal';
import { useConfig } from '../core/config/config-context';
import type { SingleProject } from '../core/config/types';
import { useEntityQuery } from '../graphql-client/use-entity-query';
import type { AttributeValue } from '../graphql-client/types';
import { useGridColumnsDefinition } from '../data-grid/columns';
import { DataTable } from '../data-grid/data-table';
import { Button } from '../ui/primitives/button';
import { Skeleton } from '../ui/primitives/skeleton';
import type { Entity, SingleRelationshipConnection, MultipleRelationshipConnection } from '../core/types';
import { useDispatch } from './actions-context';
import { type Action, type ActionEditRelationship } from './types';

type Props = {
  action: ActionEditRelationship;
  depth: number;
  isFocused: boolean;
};

const PAGE_SIZE = 25;

function getLoadingColumns(columns: object[]): ColumnDef<AttributeValue>[] {
  return columns.map((column) => ({
    ...column,
    cell: () => <Skeleton className="fk-h-4 fk-w-full" style={{ marginTop: '7px', marginBottom: '6px' }} />,
  })) as unknown as ColumnDef<AttributeValue>[];
}

export default function EditRelationship({ action, depth, isFocused }: Props): JSX.Element {
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const { relationships, scope } = useAppContext();
  const { connectedEntitiesCount, connectionName, entityId, entityName, mode, relationshipId } = action.payload;
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const entityLabel = entitySchema?.menu?.label ?? entityName.toLowerCase();
  const entityNamePlural = entitySchema?.plural ?? '';
  const relationshipContext = relationships[relationshipId];

  const initialSelectionState =
    mode === 'single'
      ? [(relationshipContext?.connect as SingleRelationshipConnection | undefined)?._id]
      : (relationshipContext?.connect as MultipleRelationshipConnection | undefined)?.map((item) => item._id);

  const [selectedRows, setSelectedRows] = useState(initialSelectionState);
  const filterOutConnectedEntities = connectionName
    ? {
        [connectionName]: {
          node: {
            _id: entityId,
          },
        },
      }
    : {};
  const conditionalWhereClause = mode === 'multiple' ? filterOutConnectedEntities : {};

  const { count, data, fetchMore, isLoading } = useEntityQuery({
    entityNamePlural,
    schema,
    scope,
    variables: {
      options: {
        offset: 0,
        limit: PAGE_SIZE,
      },
      where: conditionalWhereClause,
    },
  });

  const columns = useGridColumnsDefinition({
    attributesSchema: entitySchema?.attributes ?? [],
    checkboxSelect: mode,
  });
  const loadingData = Array(5).fill({});
  const loadingColumns = getLoadingColumns(columns);

  const handleClose = useCallback(
    (_id: Action['_id']) => {
      actionDispatch({ type: 'Dismiss', _id, payload: {} });
    },
    [actionDispatch]
  );

  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      const rowsCount = data?.length ?? 0;
      const totalCount = count - connectedEntitiesCount;

      if (containerRefElement && totalCount > 0 && rowsCount > 0) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
        if (scrollHeight - scrollTop - clientHeight < 500 && !isLoading && rowsCount < totalCount) {
          fetchMore({
            variables: {
              options: {
                offset: rowsCount,
                limit: PAGE_SIZE,
              },
            },
          });
        }
      }
    },
    [connectedEntitiesCount, count, data?.length, fetchMore, isLoading]
  );

  function handleSelection(): void {
    let connect;

    if (mode === 'single') {
      const _id = selectedRows?.[0];

      connect = {
        _id: _id ?? '',
        value: data?.find((row) => row._id === _id),
      } as SingleRelationshipConnection;
    }

    if (mode === 'multiple') {
      connect = selectedRows?.map((_id) => ({
        _id: _id ?? '',
        value: data?.find((row) => row._id === _id),
      })) as MultipleRelationshipConnection;
    }

    appDispatch({
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect,
          disconnect: relationshipContext?.disconnect ?? [],
        },
      },
    });
    handleClose(action._id);
  }

  function handleSelectionChange(selectedIds: string[]): void {
    if (mode === 'multiple') {
      setSelectedRows(selectedIds);

      return;
    }

    // if single, get only the last selected row
    setSelectedRows([selectedIds.pop()]);
  }

  function handleCreateEntity(): void {
    actionDispatch({ type: 'AddEntity', payload: { entityName } });
  }

  return (
    <DrawerModal
      actions={
        <>
          <Button
            className="fk-px-8"
            onClick={() => {
              handleSelection();
            }}
            variant="default"
          >
            Select
          </Button>
          <Button
            className="fk-px-8"
            onClick={() => {
              handleCreateEntity();
            }}
            variant="outline"
          >
            {`Create ${entityLabel}`}
          </Button>
        </>
      }
      depth={depth}
      isFocused={isFocused}
      onClose={() => {
        handleClose(action._id);
      }}
      title={`Select ${entityLabel}`}
    >
      <DataTable
        columns={isLoading ? loadingColumns : columns}
        data={isLoading ? loadingData : (data ?? [])}
        entityName={entitySchema?.name ?? ''}
        initialSelectionState={
          selectedRows?.reduce((acc, id) => ({ ...acc, ...(id ? { [id]: true } : {}) }), {}) as {
            [_id: string]: boolean;
          }
        }
        onEntitySelectionChange={handleSelectionChange}
        onScroll={(e) => {
          fetchMoreOnBottomReached(e.target as HTMLDivElement);
        }}
      />
    </DrawerModal>
  );
}
