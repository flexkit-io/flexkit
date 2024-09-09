'use client';

import { useRef, useState } from 'react';
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
  RowSelectionState,
  SortingState,
  TableMeta,
  VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/primitives/table';
import { cn } from '../ui/lib/utils';
import type { AttributeValue } from '../graphql-client/types';
import type { MultipleRelationshipConnection } from '../core/types';
import { DataTableToolbar } from './data-table-toolbar';

interface DataTableProps<TData extends AttributeValue, TValue> {
  classNames?: {
    wrapper?: string;
    table?: string;
  };
  columns: ColumnDef<AttributeValue, TValue>[];
  data: TData[];
  entityName: string;
  hasToolbar?: boolean;
  initialSelectionState?: RowSelectionState;
  onEntitySelectionChange?: (rowSelection: string[]) => void;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  pageSize?: number;
  rowAdditionState?: MultipleRelationshipConnection;
  rowDeletionState?: string[];
}

interface ExtendedDataTable extends TableMeta<unknown> {
  getRowBackground: (row: Row<AttributeValue>) => string;
}

export function DataTable<TData extends AttributeValue, TValue>({
  classNames,
  columns,
  data,
  entityName,
  hasToolbar,
  initialSelectionState,
  onEntitySelectionChange,
  onScroll,
  pageSize,
  rowAdditionState,
  rowDeletionState,
}: DataTableProps<TData, TValue>): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = useState(initialSelectionState ?? {});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: pageSize ?? 25,
      },
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
    manualPagination: true,
    meta: {
      getRowBackground: (row: Row<TData>) => getRowClassnames(row, rowDeletionState, rowAdditionState),
    },
  });

  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 45, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => scrollRef.current,
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.includes('Firefox')
        ? (element) => element.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  });

  function handleRowSelectionChange(updaterFn: Updater<RowSelectionState>): void {
    const selectedIds = typeof updaterFn === 'function' ? Object.keys(updaterFn(rowSelection)) : Object.keys(updaterFn);

    setRowSelection(updaterFn);
    onEntitySelectionChange?.(selectedIds);
  }

  return (
    <div className={cn('fk-w-full fk-h-full fk-space-y-4', classNames?.wrapper)}>
      {Boolean(hasToolbar) && <DataTableToolbar entityName={entityName} table={table} />}
      <Table className={cn('fk-grid fk-pb-[5rem]', classNames?.table)} onScroll={onScroll} ref={scrollRef}>
        <TableHeader className="fk-grid">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="fk-flex fk-w-full" key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    className="fk-flex fk-items-center"
                    colSpan={header.colSpan}
                    key={header.id}
                    style={header.getSize() ? { width: `${header.getSize().toString()}px` } : {}}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody
          className="fk-grid fk-relative"
          style={{
            height: `${rowVirtualizer.getTotalSize().toString()}px`, //tells scrollbar how big the table is
          }}
        >
          {rowVirtualizer.getVirtualItems().length ? (
            rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];

              return (
                <TableRow
                  className={`${(table.options.meta as ExtendedDataTable).getRowBackground(
                    row
                  )} fk-flex fk-absolute fk-w-full`}
                  data-index={virtualRow.index}
                  data-state={row.getIsSelected() && 'selected'}
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    transform: `translateY(${virtualRow.start.toString()}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      className="fk-flex fk-items-center"
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
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
  );
}

function getRowClassnames(
  row: Row<AttributeValue>,
  rowDeletionState?: string[],
  rowAdditionState?: MultipleRelationshipConnection
): string {
  if (rowDeletionState?.includes(row.original._id)) {
    return 'fk-bg-row-removed hover:fk-bg-row-removed-hover';
  }

  if (rowAdditionState?.some((line) => line._id === row.original._id)) {
    return 'fk-bg-row-added hover:fk-bg-row-added-hover';
  }

  return '';
}
