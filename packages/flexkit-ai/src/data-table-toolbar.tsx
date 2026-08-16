'use client';

import { useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import { LoaderCircle, Search as SearchIcon, X as ResetIcon } from 'lucide-react';
import type { ReactTable } from '@flexkit/studio';
import { DataTableFacetedFilter } from '@flexkit/studio';
import { Button, Input, ScrollArea, ScrollBar } from '@flexkit/studio/ui';

const statusOptions = [
  { label: 'Enabled', value: 'enabled' },
  { label: 'Disabled', value: 'disabled' },
];

const visibilityOptions = [
  { label: 'Project', value: 'project' },
  { label: 'Space', value: 'space' },
  { label: 'Personal', value: 'personal' },
];

interface AutomationsDataTableToolbarProps<TData> {
  actions?: ReactNode;
  isSearchLoading?: boolean;
  onSearchChange: (search: string) => void;
  search: string;
  searchPlaceholder?: string;
  table: ReactTable<TData>;
}

type DebouncedFn<TArgs extends unknown[]> = ((...args: TArgs) => void) & {
  cancel: () => void;
};

function debounce<TArgs extends unknown[]>(fn: (...args: TArgs) => void, ms = 300): DebouncedFn<TArgs> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const debounced = function (this: unknown, ...args: TArgs) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      fn.apply(this, args);
    }, ms);
  } as DebouncedFn<TArgs>;

  debounced.cancel = () => {
    if (timeoutId === undefined) {
      return;
    }

    clearTimeout(timeoutId);
    timeoutId = undefined;
  };

  return debounced;
}

export function AutomationsDataTableToolbar<TData>({
  actions,
  isSearchLoading = false,
  onSearchChange,
  search,
  searchPlaceholder = 'Search automations...',
  table,
}: AutomationsDataTableToolbarProps<TData>): JSX.Element {
  const isFiltered = table.getState().columnFilters.length > 0 || search.trim().length > 0;
  // table.getColumn(id) logs a dev-mode error when the column is missing, so
  // resolve optional filter columns by scanning instead.
  const statusColumn = table.getAllColumns().find((column) => column.id === 'status');
  const visibilityColumn = table.getAllColumns().find((column) => column.id === 'visibility');
  const [draftSearch, setDraftSearch] = useState(search);
  const trimmedDraft = draftSearch.trim();
  const trimmedSearch = search.trim();
  const isSearchPending = trimmedDraft.length > 0 && (isSearchLoading || trimmedDraft !== trimmedSearch);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;
  const debouncedSearchChange = useMemo(
    () =>
      debounce((query: string) => {
        onSearchChangeRef.current(query);
      }, 300),
    []
  );

  useEffect(() => {
    setDraftSearch(search);
  }, [search]);

  useEffect(() => {
    return () => {
      debouncedSearchChange.cancel();
    };
  }, [debouncedSearchChange]);

  function clearSearch(): void {
    debouncedSearchChange.cancel();
    setDraftSearch('');
    onSearchChange('');
  }

  function handleReset(): void {
    table.resetColumnFilters();
    clearSearch();
  }

  return (
    <div className="fk:flex fk:w-full fk:min-w-0">
      <ScrollArea className="fk:w-0 fk:min-w-0 fk:flex-1 fk:whitespace-nowrap fk:-ml-0.75">
        <div className="fk:flex fk:w-full fk:items-center fk:justify-between fk:gap-3 fk:p-0.75 fk:pb-2.5">
          <div className="fk:flex fk:shrink-0 fk:items-center fk:gap-2">
            <div className="fk:relative">
              {isSearchPending ? (
                <LoaderCircle className="fk:absolute fk:left-2 fk:top-2 fk:h-4 fk:w-4 fk:shrink-0 fk:opacity-50 fk:animate-spin" />
              ) : (
                <SearchIcon className="fk:absolute fk:left-2 fk:top-2 fk:h-4 fk:w-4 fk:shrink-0 fk:opacity-50" />
              )}
              <Input
                className="fk:h-8 fk:w-37.5 fk:lg:w-62.5 fk:px-7"
                name="search-automations"
                placeholder={searchPlaceholder}
                value={draftSearch}
                onChange={(event) => {
                  const { value } = event.target;
                  setDraftSearch(value);

                  if (value.trim().length === 0) {
                    debouncedSearchChange.cancel();
                    onSearchChange('');

                    return;
                  }

                  debouncedSearchChange(value.trim());
                }}
              />
              {draftSearch ? (
                <button
                  aria-label="Clear search"
                  className="fk:absolute fk:right-2 fk:top-2 fk:text-muted-foreground fk:hover:text-foreground fk:cursor-pointer"
                  type="button"
                  onClick={clearSearch}
                >
                  <ResetIcon className="fk:h-4 fk:w-4" />
                </button>
              ) : null}
            </div>
            {statusColumn ? (
              <DataTableFacetedFilter column={statusColumn} options={statusOptions} title="Status" />
            ) : null}
            {visibilityColumn ? (
              <DataTableFacetedFilter column={visibilityColumn} options={visibilityOptions} title="Visibility" />
            ) : null}
            {isFiltered ? (
              <Button className="fk:h-8 fk:px-2 fk:lg:px-3" onClick={handleReset} variant="ghost">
                Reset
                <ResetIcon className="fk:ml-2 fk:h-4 fk:w-4" />
              </Button>
            ) : null}
          </div>
          {actions ? <div className="fk:ml-auto fk:flex fk:shrink-0 fk:items-center fk:gap-3">{actions}</div> : null}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
