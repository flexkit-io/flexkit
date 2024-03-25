'use client';

import type { Table } from '@tanstack/react-table';
import { Button } from '../ui/primitives/button';
import { useDispatch } from '../entities/actions-context';
import { DataTableViewOptions } from './data-table-view-options';

interface DataTableToolbarProps<TData> {
  entityName: string;
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ entityName, table }: DataTableToolbarProps<TData>): JSX.Element {
  // const isFiltered = table.getState().columnFilters.length > 0;
  const actionDispatch = useDispatch();

  function handleCreate(): void {
    actionDispatch({ type: 'addEntity', payload: { entityName } });
  }

  return (
    <div className="fk-flex fk-items-center fk-justify-between">
      <div className="fk-flex fk-flex-1 fk-items-center fk-space-x-2">
        <DataTableViewOptions table={table} />
      </div>
      <Button className="fk-ml-auto fk-h-8 lg:fk-flex" onClick={handleCreate} size="sm" variant="default">
        Create
      </Button>
    </div>
  );
}
