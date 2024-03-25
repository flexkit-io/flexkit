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
import type { Entity } from '../core/types';
import { useDispatch } from './actions-context';
import type { Action, ActionEditRelationship } from './types';

type Props = {
  action: ActionEditRelationship;
  isFocused: boolean;
};

const AVAILABLE_PAGE_SIZES = [25, 50, 100];

function getLoadingColumns(columns: object[]): ColumnDef<unknown>[] {
  return columns.map((column) => ({
    ...column,
    cell: () => <Skeleton className="fk-h-4 fk-w-full" />,
  })) as unknown as ColumnDef<unknown>[];
}

export default function EditRelationship({ action, isFocused }: Props): JSX.Element {
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const { relationships, scope } = useAppContext();
  const [paginationModel, setPaginationModel] = useState({
    pageSize: AVAILABLE_PAGE_SIZES[0],
    page: 0,
  });
  const { entityName, relationshipId, mode } = action.payload;
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const entityNamePlural = entitySchema?.plural || '';
  const relationshipContext = relationships[relationshipId];
  // const initialSelectionState = relationshipContext.connect?.length
  //   ? relationshipContext.connect.map((item) => item._id)
  //   : [];
  // const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>(initialSelectionState);

  const [loading, { count, results }] = useEntityQuery({
    entityNamePlural: entitySchema?.plural || '',
    schema,
    scope,
    variables: { options: { offset: paginationModel.page, limit: paginationModel.pageSize } },
  });

  const columns = useMemo(
    () =>
      gridColumnsDefinition({
        entityName,
        entityNamePlural,
        attributesSchema: entitySchema?.attributes || [],
        checkboxSelect: mode,
      }),
    [entityName, entityNamePlural, entitySchema?.attributes, mode]
  );
  const loadingData = Array(5).fill({});
  const loadingColumns = getLoadingColumns(columns);

  const handleSelection = (selection: GridRowSelectionModel) => {
    if (mode === 'multiple') {
      // setRowSelectionModel(selection);

      return;
    }

    // setRowSelectionModel([selection[selection.length - 1]]);
  };

  const handleClose = useCallback(
    (_id: Action['_id']) => {
      actionDispatch({ type: 'dismiss', _id, payload: {} });
    },
    [actionDispatch]
  );

  const handleSave = () => {
    appDispatch({
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect: [] /* rowSelectionModel.map((_id) => ({
            _id,
            row: (results as []).find((r: { _id: string }) => r._id === _id),
          })) */,
          disconnect: [], //relationshipContext?.disconnect ?? [],
        },
      },
    });
    handleClose(action._id);
  };

  return (
    <DrawerModal
      actionButtonLabel="Select"
      // editMenu={<EditMenu />}
      isActionButtonEnabledByDefault
      isFocused={isFocused}
      onClose={() => {
        handleClose(action._id);
      }}
      onSave={() => {
        handleSave();
      }}
      title={`Select ${entityName.toLowerCase()}`}
    >
      <DataTable
        columns={loading ? loadingColumns : columns}
        data={loading ? loadingData : results}
        entityName={entitySchema?.name || ''}
      />
      {/* <Box sx={{ height: 'calc(100% - 5rem)', width: '100%' }}>
        <StyledDataGrid
          checkboxSelection={mode === 'multiple'}
          columns={columns}
          components={{
            Toolbar: GridToolbar,
            LoadingOverlay: LinearProgress,
            Pagination,
          }}
          componentsProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          density="compact"
          getRowId={(row) => row._id}
          keepNonExistentRowsSelected
          loading={isLoading || loading}
          getRowClassName={(params) => (rowSelectionModel.includes(params.id) ? 'relationship-selected' : '')}
          onPaginationModelChange={setPaginationModel}
          onRowSelectionModelChange={(selection) => handleSelection(selection)}
          paginationModel={paginationModel}
          pageSizeOptions={AVAILABLE_PAGE_SIZES}
          paginationMode="server"
          rowCount={count}
          rows={results || []}
          rowSelectionModel={rowSelectionModel}
        />
      </Box> */}
    </DrawerModal>
  );
}
