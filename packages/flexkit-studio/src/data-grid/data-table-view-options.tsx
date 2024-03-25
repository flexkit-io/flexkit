'use client';

import { Settings2 } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { Button } from '../ui/primitives/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/primitives/dropdown-menu';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="fk-hidden fk-h-8 lg:fk-flex" size="sm" variant="outline">
          <Settings2 className="fk-mr-2 fk-h-4 fk-w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="fk-w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                checked={column.getIsVisible()}
                className="capitalize"
                key={column.id}
                onCheckedChange={(value) => {
                  column.toggleVisibility(Boolean(value));
                }}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
