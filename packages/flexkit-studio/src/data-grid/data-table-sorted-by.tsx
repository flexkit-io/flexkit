'use client';

import type { JSX } from 'react';
import { X } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { Button } from '../ui/primitives/button';

interface DataTableSortedByProps<TData> {
  table: Table<TData>;
}

type ColumnMeta = {
  label?: string;
};

export function DataTableSortedBy<TData>({ table }: DataTableSortedByProps<TData>): JSX.Element | null {
  const [sort] = table.getState().sorting;

  if (!sort) {
    return null;
  }

  const column = table.getColumn(sort.id);
  const label = (column?.columnDef.meta as ColumnMeta | undefined)?.label ?? sort.id;
  const direction = sort.desc ? 'desc' : 'asc';

  return (
    <Button
      aria-label={`Clear sorting by ${label}`}
      className="fk:h-8 fk:px-2 fk:lg:px-3 fk:text-success fk:border-none"
      onClick={() => {
        table.resetSorting();
      }}
      size="sm"
      variant="outline"
    >
      Sorted by {label} {direction}
      <X className="fk:ml-1 fk:h-4 fk:w-4" />
    </Button>
  );
}
