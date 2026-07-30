'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX, ReactElement, UIEvent } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  Updater,
  Row,
  RowSelectionState,
  SortingState,
  Table,
  TableMeta,
  VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Table as TablePrimitive,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/primitives/table';
import { cn } from '../ui/lib/utils';
import type { AttributeValue } from '../graphql-client/types';
import type { MultipleRelationshipConnection } from '../core/types';
import { useGraphQLError } from '../graphql-client/graphql-context';

interface DataTableProps<TData extends AttributeValue, TValue> {
  classNames?: {
    wrapper?: string;
    table?: string;
    tableContainer?: string;
    row?: string;
  };
  columns: ColumnDef<AttributeValue, TValue>[];
  data: TData[];
  entityName: string;
  hasMore?: boolean;
  initialSelectionState?: RowSelectionState;
  isLoadingMore?: boolean;
  onEntitySelectionChange?: (rowSelection: string[]) => void;
  onLoadMore?: () => void;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onSortingChange?: OnChangeFn<SortingState>;
  pageSize?: number;
  rowHeightEstimate?: number;
  rowAdditionState?: MultipleRelationshipConnection;
  rowDeletionState?: string[];
  scrollToTopKey?: number;
  sorting?: SortingState;
  toolbarComponent?: (table: Table<AttributeValue>) => ReactElement;
}

interface ExtendedDataTable extends TableMeta<unknown> {
  getRowBackground: (row: Row<AttributeValue>) => string;
}

// Matches default `fk:h-9` rows (text-sm / 28px assets + cell padding + border).
const DEFAULT_ROW_HEIGHT_PX = 36;

function inferRowHeightEstimate(rowClassName?: string): number | undefined {
  if (!rowClassName) {
    return undefined;
  }

  const tokens = rowClassName.split(/\s+/);

  if (tokens.includes('fk:h-20')) {
    return 80;
  }

  if (tokens.includes('fk:h-10')) {
    return 40;
  }

  if (tokens.includes('fk:h-9')) {
    return 36;
  }

  return undefined;
}

function resolveRowHeightPx(rowHeightEstimate?: number, rowClassName?: string): number {
  return rowHeightEstimate ?? inferRowHeightEstimate(rowClassName) ?? DEFAULT_ROW_HEIGHT_PX;
}

function getLoadMoreThreshold(clientHeight: number): number {
  // Prefetch about one viewport ahead so faster scrolls still request early.
  return Math.max(600, clientHeight);
}

export function DataTable<TData extends AttributeValue, TValue>({
  classNames,
  columns,
  data,
  entityName,
  hasMore = false,
  initialSelectionState,
  isLoadingMore = false,
  onEntitySelectionChange,
  onLoadMore,
  onScroll,
  onSortingChange,
  pageSize,
  rowHeightEstimate,
  rowAdditionState,
  rowDeletionState,
  scrollToTopKey,
  sorting: sortingProp,
  toolbarComponent,
}: DataTableProps<TData, TValue>): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { schemaErrorMessage } = useGraphQLError();
  const [rowSelection, setRowSelection] = useState(initialSelectionState ?? {});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [uncontrolledSorting, setUncontrolledSorting] = useState<SortingState>([]);
  const sorting = sortingProp ?? uncontrolledSorting;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [entityName, scrollToTopKey]);

  useEffect(() => {
    if (!initialSelectionState) {
      return;
    }

    const currentSelection = Object.keys(rowSelection).sort().join(',');
    const nextSelection = Object.keys(initialSelectionState).sort().join(',');

    if (currentSelection === nextSelection) {
      return;
    }

    setRowSelection(initialSelectionState);
  }, [initialSelectionState, rowSelection]);

  function handleSortingChange(updater: Updater<SortingState>): void {
    if (onSortingChange) {
      onSortingChange(updater);

      return;
    }

    setUncontrolledSorting(updater);
  }

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
        pageSize: pageSize ?? 50,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id,
    // Filtering is applied via GraphQL `where` (Asset Manager toolbar); keep loaded
    // pages intact instead of re-filtering them client-side.
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    meta: {
      getRowBackground: (row: Row<AttributeValue>) => getRowClassnames(row, rowDeletionState, rowAdditionState),
    },
  });

  const { rows } = table.getRowModel();
  const rowHeightPx = resolveRowHeightPx(rowHeightEstimate, classNames?.row);
  const hasExplicitRowHeightClass = inferRowHeightEstimate(classNames?.row) != null;
  // Fixed row heights: skip dynamic measurement so infinite-scroll appends keep
  // identical spacing (estimate corrections were causing a brief taller jump).
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => rowHeightPx,
    getScrollElement: () => scrollRef.current,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Keep load-more inputs in refs so callback identity churn from parents
  // (e.g. Apollo fetchMore) cannot re-trigger the effect every render.
  const onLoadMoreRef = useRef(onLoadMore);
  const hasMoreRef = useRef(hasMore);
  const isLoadingMoreRef = useRef(isLoadingMore);
  onLoadMoreRef.current = onLoadMore;
  hasMoreRef.current = hasMore;
  isLoadingMoreRef.current = isLoadingMore;

  const checkLoadMore = useCallback((container?: HTMLDivElement | null) => {
    if (!onLoadMoreRef.current || !hasMoreRef.current || isLoadingMoreRef.current) {
      return;
    }

    const scrollElement = container ?? scrollRef.current;

    if (!scrollElement) {
      return;
    }

    const { scrollHeight, scrollTop, clientHeight } = scrollElement;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom >= getLoadMoreThreshold(clientHeight)) {
      return;
    }

    // Optimistic guard until the parent's isLoadingMore prop catches up.
    isLoadingMoreRef.current = true;
    onLoadMoreRef.current();
  }, []);

  // Re-check when rows/hasMore/loading settle — not when parent callback identities change.
  useEffect(() => {
    checkLoadMore();
  }, [checkLoadMore, rows.length, hasMore, isLoadingMore]);

  function handleRowSelectionChange(updaterFn: Updater<RowSelectionState>): void {
    const selectedIds = typeof updaterFn === 'function' ? Object.keys(updaterFn(rowSelection)) : Object.keys(updaterFn);

    setRowSelection(updaterFn);
    onEntitySelectionChange?.(selectedIds);
  }

  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    onScroll?.(event);
    checkLoadMore(event.currentTarget);
  }

  if (schemaErrorMessage) {
    return <></>;
  }

  return (
    <div className={cn('fk:flex fk:h-full fk:min-h-0 fk:w-full fk:min-w-0 fk:flex-col fk:gap-4', classNames?.wrapper)}>
      {toolbarComponent && toolbarComponent(table)}
      <div className="fk:relative fk:min-h-0 fk:min-w-0 fk:flex-1 fk:-mb-px">
        <TablePrimitive
          className={cn('fk:grid fk:pb-20', classNames?.table)}
          containerClassName={classNames?.tableContainer}
          onScroll={handleScroll}
          ref={scrollRef}
        >
          <TableHeader className="fk:sticky fk:top-0 fk:z-10 fk:grid">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow className="fk:flex fk:w-full" key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      className={cn('fk:flex fk:items-center', header.column.id === 'actions' && 'fk:pl-0')}
                      colSpan={header.colSpan}
                      key={header.id}
                      style={header.getSize() ? { width: `${header.getSize().toString()}px` } : {}}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {isLoadingMore ? (
                        <div
                          aria-hidden
                          className="fk:pointer-events-none fk:absolute fk:top-10.25 fk:right-px fk:left-px fk:z-20 fk:h-0.5 fk:overflow-hidden fk:opacity-4"
                        >
                          <div className="fk:animate-progress fk:h-full fk:w-full fk:bg-foreground" />
                        </div>
                      ) : null}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            className="fk:grid fk:relative"
            style={{
              height: `${totalSize.toString()}px`, //tells scrollbar how big the table is
            }}
          >
            {virtualItems.length ? (
              virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index];

                return (
                  <TableRow
                    className={cn(
                      (table.options.meta as ExtendedDataTable).getRowBackground(row),
                      'fk:flex fk:absolute fk:w-full fk:overflow-hidden',
                      !hasExplicitRowHeightClass && rowHeightEstimate == null && 'fk:h-9',
                      classNames?.row
                    )}
                    data-index={virtualRow.index}
                    data-state={row.getIsSelected() && 'selected'}
                    key={virtualRow.key}
                    style={{
                      height: `${rowHeightPx.toString()}px`,
                      transform: `translateY(${virtualRow.start.toString()}px)`,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        className={cn(
                          'fk:flex fk:items-center fk:truncate',
                          cell.column.id === 'actions' && 'fk:pl-1!'
                        )}
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
                <TableCell className="fk:h-24 fk:text-center" colSpan={columns.length}>
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </TablePrimitive>
      </div>
    </div>
  );
}

function getRowClassnames(
  row: Row<AttributeValue>,
  rowDeletionState?: string[],
  rowAdditionState?: MultipleRelationshipConnection
): string {
  if (rowDeletionState?.includes(row.original._id)) {
    return 'fk:bg-row-removed fk:hover:bg-row-removed-hover';
  }

  if (rowAdditionState?.some((line) => line._id === row.original._id)) {
    return 'fk:bg-row-added fk:hover:bg-row-added-hover';
  }

  return '';
}
