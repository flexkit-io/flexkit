'use client';

import { useCallback, useMemo, useState } from 'react';
import { find, propEq } from 'ramda';
import type { ColumnDef } from '@tanstack/react-table';
import { useAppContext, useAppDispatch } from '../core/app-context';
import DrawerModal from '../ui/components/drawer-modal';
import { useConfig } from '../core/config/config-context';
import type { SingleProject } from '../core/config/types';
import { useEntityQuery } from '../graphql-client/use-entity-query';
import { gridColumnsDefinition } from '../data-grid/columns';
import { DataTable } from '../data-grid/data-table';
import { Skeleton } from '../ui/primitives/skeleton';
import type { Entity, RelationshipConnection } from '../core/types';
import { useDispatch } from './actions-context';
import { type Action, type ActionEditRelationship } from './types';

type Props = {
  action: ActionEditRelationship;
  depth: number;
  isFocused: boolean;
};

const AVAILABLE_PAGE_SIZES = [25, 50, 100];

function getLoadingColumns(columns: object[]): ColumnDef<unknown>[] {
  return columns.map((column) => ({
    ...column,
    cell: () => <Skeleton className="fk-h-4 fk-w-full" />,
  })) as unknown as ColumnDef<unknown>[];
}

export default function EditRelationship({ action, depth, isFocused }: Props): JSX.Element {
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const { relationships, scope } = useAppContext();
  const [paginationModel, setPaginationModel] = useState({
    pageSize: AVAILABLE_PAGE_SIZES[0],
    page: 0,
  });
  const { entityId, entityName, connectionName, relationshipId, mode } = action.payload;
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const entityNamePlural = entitySchema?.plural ?? '';
  const relationshipContext = relationships[relationshipId];

  // const initialSelectionState = relationshipContext?.connect?.length
  //   ? relationshipContext.connect.map((item) => item._id)
  //   : [relationshipContext?.connect?._id];

  const initialSelectionState =
    mode === 'single'
      ? [(relationshipContext?.connect as RelationshipConnection | undefined)?._id]
      : (relationshipContext?.connect as RelationshipConnection[] | undefined)?.map((item) => item._id);

  const [selectedRows, setSelectedRows] = useState(initialSelectionState);
  const filterOutConnectedEntities = {
    [connectionName ?? '']: {
      node: {
        _id: entityId,
      },
    },
  };
  const conditionalWhereClause = mode === 'multiple' ? filterOutConnectedEntities : {};

  const [loading, { count, results }] = useEntityQuery({
    entityNamePlural,
    schema,
    scope,
    variables: {
      options: {
        offset: paginationModel.page,
        limit: paginationModel.pageSize,
      },
      where: conditionalWhereClause,
    },
  });

  const columns = useMemo(
    () =>
      gridColumnsDefinition({
        attributesSchema: entitySchema?.attributes ?? [],
        checkboxSelect: mode,
      }),
    [entitySchema?.attributes, mode]
  );
  const loadingData = Array(5).fill({});
  const loadingColumns = getLoadingColumns(columns);

  const handleClose = useCallback(
    (_id: Action['_id']) => {
      actionDispatch({ type: 'Dismiss', _id, payload: {} });
    },
    [actionDispatch]
  );

  function handleSelection(): void {
    let connect;

    if (mode === 'single') {
      const _id = selectedRows?.[0];

      connect = {
        _id: _id ?? '',
        value: results.find((row) => row._id === _id),
      };
    }

    if (mode === 'multiple') {
      connect = selectedRows?.map((_id) => ({
        _id: _id ?? '',
        value: results.find((row) => row._id === _id),
      }));
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

  return (
    <DrawerModal
      actionButtonLabel="Select"
      depth={depth}
      // editMenu={<EditMenu />}
      isActionButtonEnabledByDefault
      isFocused={isFocused}
      onClose={() => {
        handleClose(action._id);
      }}
      onSave={() => {
        handleSelection();
      }}
      title={`Select ${entityName.toLowerCase()}`}
    >
      <DataTable
        columns={loading ? loadingColumns : columns}
        data={loading ? loadingData : results}
        entityName={entitySchema?.name ?? ''}
        initialSelectionState={
          selectedRows?.reduce((acc, id) => ({ ...acc, ...(id ? { [id]: true } : {}) }), {}) as {
            [_id: string]: boolean;
          }
        }
        onEntitySelectionChange={handleSelectionChange}
      />
    </DrawerModal>
  );
}
