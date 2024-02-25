'use client';

import { Button, useDispatch } from '@flexkit/studio';
import type { ReactTable as Table } from '@flexkit/studio';
import { DataTableViewOptions } from './data-table-view-options';

interface DataTableToolbarProps<TData> {
  entityName: string;
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ entityName, table }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const actionDispatch = useDispatch();

  function handleCreate() {
    actionDispatch({ type: 'addEntity', payload: { entityName } });
  }

  return (
    <div className="fk-flex fk-items-center fk-justify-between">
      <div className="fk-flex fk-flex-1 fk-items-center fk-space-x-2">
        <DataTableViewOptions table={table} />
      </div>
      <Button variant="default" size="sm" className="fk-ml-auto fk-h-8 lg:fk-flex" onClick={handleCreate}>
        Create
      </Button>
    </div>
  );
}
