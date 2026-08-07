'use client';

import { useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';
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
  table: ReactTable<TData>;
}

function debounce<TArgs extends unknown[]>(fn: (...args: TArgs) => void, ms = 300) {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function (this: unknown, ...args: TArgs) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function AutomationsDataTableToolbar<TData>({
  actions,
  isSearchLoading = false,
  onSearchChange,
  search,
  table,
}: AutomationsDataTableToolbarProps<TData>): JSX.Element {
  const isFiltered = table.getState().columnFilters.length > 0 || search.trim().length > 0;
  const [draftSearch, setDraftSearch] = useState(search);
  const trimmedDraft = draftSearch.trim();
  const trimmedSearch = search.trim();
  const isSearchPending = trimmedDraft.length > 0 && (isSearchLoading || trimmedDraft !== trimmedSearch);
  const debouncedSearchChange = useMemo(
    () =>
      debounce((query: string) => {
        onSearchChange(query);
      }, 300),
    [onSearchChange]
  );

  useEffect(() => {
    setDraftSearch(search);
  }, [search]);

  function clearSearch(): void {
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
                placeholder="Search automations..."
                value={draftSearch}
                onChange={(event) => {
                  const { value } = event.target;
                  setDraftSearch(value);

                  if (value.trim().length === 0) {
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
            {table.getColumn('status') ? (
              <DataTableFacetedFilter column={table.getColumn('status')} options={statusOptions} title="Status" />
            ) : null}
            {table.getColumn('visibility') ? (
              <DataTableFacetedFilter
                column={table.getColumn('visibility')}
                options={visibilityOptions}
                title="Visibility"
              />
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
