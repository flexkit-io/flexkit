'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  ColumnFiltersState,
  Updater,
  Row,
  RowData,
  RowSelectionState,
  SortingState,
  TableMeta,
  VisibilityState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/primitives/table';
import { DataTableToolbar } from './data-table-toolbar';

interface DataTableProps<TData extends { [key: string]: unknown; _id: string }, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  entityName: string;
  hasToolbar?: boolean;
  initialSelectionState?: RowSelectionState;
  onEntitySelectionChange?: (rowSelection: string[]) => void;
  rowDeletionState?: string[];
}

interface ExtendedDataTable extends TableMeta<unknown> {
  getRowBackground: (row: Row<RowData>) => string;
}

export function DataTable<TData extends { [key: string]: unknown; _id: string }, TValue>({
  columns,
  data,
  entityName,
  hasToolbar,
  initialSelectionState,
  onEntitySelectionChange,
  rowDeletionState,
}: DataTableProps<TData, TValue>): JSX.Element {
  const [rowSelection, setRowSelection] = React.useState(initialSelectionState || {});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => row._id,
    meta: {
      getRowBackground: (row: Row<TData>) =>
        rowDeletionState?.includes(row.original._id) ? 'fk-bg-red-200 hover:fk-bg-red-300' : '',
    },
  });

  function handleRowSelectionChange(updaterFn: Updater<RowSelectionState>): void {
    const selectedIds = typeof updaterFn === 'function' ? Object.keys(updaterFn(rowSelection)) : Object.keys(updaterFn);

    setRowSelection(updaterFn);
    onEntitySelectionChange?.(selectedIds);
  }

  return (
    <div className="fk-w-full fk-space-y-4">
      {Boolean(hasToolbar) && <DataTableToolbar entityName={entityName} table={table} />}
      <div className="fk-rounded-md fk-border-border fk-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      colSpan={header.colSpan}
                      key={header.id}
                      style={header.getSize() ? { width: `${header.getSize()}px` } : {}}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className={(table.options.meta as ExtendedDataTable).getRowBackground(row)}
                  data-state={row.getIsSelected() && 'selected'}
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="fk-h-24 fk-text-center" colSpan={columns.length}>
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
