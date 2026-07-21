'use client';

import type { JSX } from 'react';
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';
import type { Column } from '@tanstack/react-table';
import { cn } from '../ui/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/primitives/dropdown-menu';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>): JSX.Element {
  if (!column.getCanSort()) {
    return <div className={cn('fk:flex fk:items-center', className)}>{title}</div>;
  }

  const isSortedAsc = column.getIsSorted() === 'asc';
  const isSortedDesc = column.getIsSorted() === 'desc';

  return (
    <div className={cn('fk:flex fk:w-full fk:items-center fk:justify-between fk:gap-1', className)}>
      <span className="fk:truncate">{title}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Sort ${title}`}
            className="fk:inline-flex fk:shrink-0 fk:items-center fk:justify-center fk:rounded-sm fk:p-0.5 fk:text-muted-foreground fk:outline-hidden fk:hover:bg-accent fk:hover:text-accent-foreground fk:focus-visible:ring-1 fk:focus-visible:ring-ring"
            type="button"
          >
            <ChevronDown className="fk:h-3.5 fk:w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="fk:w-44">
          <DropdownMenuItem
            aria-checked={isSortedAsc}
            className={cn(isSortedAsc && 'fk:bg-accent fk:text-accent-foreground')}
            onSelect={() => {
              if (isSortedAsc) {
                column.clearSorting();

                return;
              }

              column.toggleSorting(false);
            }}
            role="menuitemcheckbox"
          >
            <ArrowUp className={cn('fk:h-4 fk:w-4', isSortedAsc && 'fk:text-white')} />
            Sort Ascending
          </DropdownMenuItem>
          <DropdownMenuItem
            aria-checked={isSortedDesc}
            className={cn(isSortedDesc && 'fk:bg-accent fk:text-accent-foreground')}
            onSelect={() => {
              if (isSortedDesc) {
                column.clearSorting();

                return;
              }

              column.toggleSorting(true);
            }}
            role="menuitemcheckbox"
          >
            <ArrowDown className={cn('fk:h-4 fk:w-4', isSortedDesc && 'fk:text-white')} />
            Sort Descending
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
