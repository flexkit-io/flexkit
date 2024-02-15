'use client';

import { Button } from '@flexkit/studio';
import type { ReactTable as Table } from '@flexkit/studio';
import { DataTableViewOptions } from './data-table-view-options';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="fk-flex fk-items-center fk-justify-between">
      <div className="fk-flex fk-flex-1 fk-items-center fk-space-x-2">
        <DataTableViewOptions table={table} />
      </div>
      <Button variant="default" size="sm" className="fk-ml-auto fk-hidden fk-h-8 lg:fk-flex">
        Create
      </Button>
    </div>
  );
}
