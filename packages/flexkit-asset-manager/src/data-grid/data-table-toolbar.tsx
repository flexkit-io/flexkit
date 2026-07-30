'use client';

import { JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FilePlayIcon,
  ImageIcon,
  ImagePlayIcon,
  LayersIcon,
  LayoutGrid,
  List,
  ListChecks,
  MinusIcon,
  SplinePointerIcon,
  TagIcon,
  Trash2Icon,
  LoaderCircle,
  Search as SearchIcon,
  X as ResetIcon,
} from 'lucide-react';
import type { ReactTable, SearchRequestProps } from '@flexkit/studio';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from '@flexkit/studio/ui';
import type { AssetViewMode } from './view-mode';
import { AssetTagDialogs, type AssetTagDialogMode } from './asset-tag-dialogs';
import {
  DataTableFacetedFilter,
  DataTableSortedBy,
  useParams,
  useUploadAssets,
  useDispatch,
  useEntityQuery,
  useAppContext,
  useConfig,
  useSearch,
} from '@flexkit/studio';

interface DataTableToolbarProps<TData> {
  entityName: string;
  table: ReactTable<TData>;
  viewMode: AssetViewMode;
  onViewModeChange: (mode: AssetViewMode) => void;
  onSearchLoadingChange?: (isLoading: boolean) => void;
  onSearchWhereChange?: (where: WhereClause) => void;
}

type WhereClause = { [key: string]: unknown };

const mimeTypes = [
  {
    value: 'image/gif',
    label: 'GIF',
    icon: ImagePlayIcon,
  },
  {
    value: 'image/jpeg',
    label: 'JPEG',
    icon: ImageIcon,
  },
  {
    value: 'video/mp4',
    label: 'MP4',
    icon: FilePlayIcon,
  },
  {
    value: 'image/png',
    label: 'PNG',
    icon: LayersIcon,
  },
  {
    value: 'image/svg+xml',
    label: 'SVG',
    icon: SplinePointerIcon,
  },
  {
    value: 'image/webp',
    label: 'WebP',
    icon: ImageIcon,
  },
];

export function DataTableToolbar<TData>({
  entityName,
  table,
  viewMode,
  onViewModeChange,
  onSearchLoadingChange,
  onSearchWhereChange,
}: DataTableToolbarProps<TData>): JSX.Element {
  const isFiltered = table.getState().columnFilters.length > 0;
  const { projectId } = useParams();
  const uploadAssets = useUploadAssets();
  const dispatch = useDispatch();
  const { scope } = useAppContext();
  const [tagDialogMode, setTagDialogMode] = useState<AssetTagDialogMode>(null);
  const { currentProjectSchema: schema } = useConfig();
  const [search, setSearch] = useState('');
  const textWhereRef = useRef<WhereClause>({});
  const filterWhereRef = useRef<WhereClause>({});

  function getBaseSearchRequest(): SearchRequestProps {
    return {
      searchRequests: {
        searches: [{ collection: '_assets' }, { collection: '_tags' }],
      },
      commonParams: { q: '' },
    };
  }

  const baseSearchRequest = useMemo(() => getBaseSearchRequest(), []);
  const [searchQuery, setSearchQuery] = useState<SearchRequestProps>(baseSearchRequest);
  const { results, isLoading } = useSearch(projectId ?? '', searchQuery);
  const lastWhereRef = useRef<string>('');
  const trimmedSearch = search.trim();
  const committedSearchQuery = searchQuery.commonParams.q ?? '';
  const isSearchPending = trimmedSearch.length > 0 && (isLoading || committedSearchQuery !== trimmedSearch);

  const debouncedSetSearchQuery = useMemo(
    () =>
      debounce((query: string) => {
        setSearchQuery({ ...baseSearchRequest, commonParams: { q: query } });
      }, 300),
    [baseSearchRequest]
  );

  async function handleUpload(): Promise<void> {
    await uploadAssets({ projectId, accept: 'image/*', multiple: true, maxBytes: 4 * 1024 * 1024 });
  }

  // Collect selected entity ids from the table
  const selectedIds: string[] = table
    .getSelectedRowModel()
    .rows.map((row) => (row.original as unknown as { _id: string })._id);

  const tagsQueryVariables = useMemo(() => ({ where: {}, limit: 500, offset: 0, sort: [{ name: 'ASC' }] }), []);

  // Load tags for the selector (full tags collection, not derived from loaded assets)
  const { data: tagsData } = useEntityQuery({
    entityNamePlural: '_tags',
    schema,
    scope,
    variables: tagsQueryVariables,
    selection: 'list',
  });
  const allTags = useMemo(() => {
    const items = Array.isArray(tagsData) ? (tagsData as unknown[]) : [];

    return items.map((t) => ({ _id: (t as { _id: string })._id, name: (t as { name: string }).name }));
  }, [tagsData]);

  const tagOptions = useMemo(() => {
    return allTags.map((t) => ({ value: t._id, label: t.name }));
  }, [allTags]);

  const emitCombinedWhere = useCallback((): void => {
    if (!onSearchWhereChange) {
      return;
    }

    const clauses: WhereClause[] = [];

    if (Object.keys(textWhereRef.current).length > 0) {
      clauses.push(textWhereRef.current);
    }

    if (Object.keys(filterWhereRef.current).length > 0) {
      clauses.push(filterWhereRef.current);
    }

    const combinedWhere = clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { AND: clauses };
    const whereKey = JSON.stringify(combinedWhere);

    if (lastWhereRef.current !== whereKey) {
      lastWhereRef.current = whereKey;
      onSearchWhereChange(combinedWhere);
    }
  }, [onSearchWhereChange]);

  async function handleBatchDelete(): Promise<void> {
    dispatch({
      type: 'AlertDialog',
      payload: {
        options: {
          dialogTitle: `Delete ${selectedIds.length} asset${selectedIds.length > 1 ? 's' : ''}`,
          dialogMessage:
            selectedIds.length > 1
              ? `Are you sure you want to delete the selected assets? They will be deleted permanently.`
              : `Are you sure you want to delete the selected asset? The item will be deleted permanently.`,
          dialogCancelTitle: 'Cancel',
          dialogActionLabel: 'Delete',
          isDestructive: true,
          dialogActionCancel: () => {},
          dialogActionSubmit: () => {
            // One DeleteEntity action → one GraphQL mutation with `_id: { in: [...] }`.
            dispatch({
              type: 'DeleteEntity',
              _id: `delete-batch-${Date.now()}`,
              payload: { entityId: selectedIds, entityName, silent: true },
            });

            table.resetRowSelection();
          },
        },
      },
    });
  }

  useEffect(() => {
    onSearchLoadingChange?.(isSearchPending);
  }, [isSearchPending, onSearchLoadingChange]);

  useEffect(() => {
    if (!onSearchWhereChange) {
      return;
    }

    if (trimmedSearch.length === 0) {
      textWhereRef.current = {};
      emitCombinedWhere();

      return;
    }

    // Wait for debounce + search results before applying text filters (avoids empty-table flash).
    if (isSearchPending) {
      return;
    }

    const safeResults = results ?? [];
    let nextWhere: WhereClause = {};

    if (safeResults.length === 0) {
      nextWhere = { _id: { in: [] } };
    } else {
      // Prefer `_id: { in: [...] }` over one OR-eq per hit. Large OR trees break
      // offset pagination and were re-triggering endless fetchMore requests.
      const assetIds = safeResults.filter((r) => r._entityNamePlural === '_assets').map((r) => r._id);
      const tagClauses = safeResults
        .filter((r) => r._entityNamePlural === '_tags')
        .map((r) => ({ tags: { some: { _id: { eq: r._id } } } }));

      const orClauses: WhereClause[] = [];

      if (assetIds.length > 0) {
        orClauses.push({ _id: { in: assetIds } });
      }

      orClauses.push(...tagClauses);

      if (orClauses.length === 0) {
        nextWhere = { _id: { in: [] } };
      } else if (orClauses.length === 1) {
        nextWhere = orClauses[0] as WhereClause;
      } else {
        nextWhere = { OR: orClauses };
      }
    }

    textWhereRef.current = nextWhere;
    emitCombinedWhere();
  }, [emitCombinedWhere, isSearchPending, onSearchWhereChange, results, trimmedSearch]);

  // Watch column filter changes (e.g., mime type) and push server-side where
  const columnFiltersKey = JSON.stringify(table.getState().columnFilters);

  useEffect(() => {
    if (!onSearchWhereChange) {
      return;
    }

    const mimeFilter = table.getState().columnFilters.find((f) => f.id === 'mimeType');
    const mimeValues = (Array.isArray(mimeFilter?.value) ? (mimeFilter?.value as unknown[]) : []) as string[];

    const tagsFilter = table.getState().columnFilters.find((f) => f.id === 'tags');
    const tagValues = (Array.isArray(tagsFilter?.value) ? (tagsFilter?.value as unknown[]) : []) as string[];

    const clauses: WhereClause[] = [];

    if (mimeValues.length > 0) {
      clauses.push({ mimeType: { in: mimeValues } } as WhereClause);
    }

    if (tagValues.length > 0) {
      const orTags = tagValues.map((id) => ({ tags: { some: { _id: { eq: id } } } }));
      clauses.push(orTags.length === 1 ? orTags[0] : { OR: orTags });
    }

    if (clauses.length === 0) {
      filterWhereRef.current = {};
    } else if (clauses.length === 1) {
      filterWhereRef.current = clauses[0] as WhereClause;
    } else {
      filterWhereRef.current = { AND: clauses } as WhereClause;
    }

    emitCombinedWhere();
  }, [columnFiltersKey, emitCombinedWhere, onSearchWhereChange, table]);

  return (
    <div className="fk:flex fk:items-center fk:justify-between">
      <div className="fk:flex fk:flex-1 fk:items-center fk:space-x-2">
        <div className="fk:relative">
          {isLoading ? (
            <LoaderCircle className="fk:absolute fk:left-2 fk:top-2 fk:h-4 fk:w-4 fk:shrink-0 fk:opacity-50 fk:animate-spin" />
          ) : (
            <SearchIcon className="fk:absolute fk:left-2 fk:top-2 fk:h-4 fk:w-4 fk:shrink-0 fk:opacity-50" />
          )}
          <Input
            placeholder="Search assets..."
            name="search-assets"
            value={search}
            onChange={(e) => {
              const { value } = e.target;
              setSearch(value);

              if (value.trim().length === 0) {
                setSearchQuery({ ...baseSearchRequest, commonParams: { q: '' } });
                textWhereRef.current = {};
                emitCombinedWhere();

                return;
              }

              debouncedSetSearchQuery(value.trim());
            }}
            className="fk:h-8 fk:w-37.5 fk:lg:w-62.5 fk:px-7"
          />
          {search ? (
            <button
              aria-label="Clear search"
              className="fk:absolute fk:right-2 fk:top-2 fk:text-muted-foreground fk:hover:text-foreground fk:cursor-pointer"
              onClick={() => {
                setSearch('');
                setSearchQuery({ ...baseSearchRequest, commonParams: { q: '' } });
                textWhereRef.current = {};
                emitCombinedWhere();
              }}
              type="button"
            >
              <ResetIcon className="fk:h-4 fk:w-4" />
            </button>
          ) : null}
        </div>
        {table.getColumn('mimeType') && (
          <DataTableFacetedFilter column={table.getColumn('mimeType')} options={mimeTypes} title="File type" />
        )}
        {table.getColumn('tags') && (
          <DataTableFacetedFilter column={table.getColumn('tags')} options={tagOptions} title="Tags" />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              filterWhereRef.current = {};
              emitCombinedWhere();
            }}
            className="fk:h-8 fk:px-2 fk:lg:px-3"
          >
            Reset
            <ResetIcon className="fk:ml-2 fk:h-4 fk:w-4" />
          </Button>
        )}
        <DataTableSortedBy table={table} />
      </div>
      {selectedIds.length > 0 ? (
        <div className="fk:flex fk:items-center fk:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="fk:h-8 fk:mr-2 fk:lg:flex" size="sm" variant="secondary">
                Actions <ListChecks className="fk:ml-2 fk:h-4 fk:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="fk:w-[240px]">
              <DropdownMenuItem onClick={() => setTagDialogMode('add')}>
                <TagIcon className="fk:mr-2 fk:h-4 fk:w-4" /> Add tag
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTagDialogMode('remove')}>
                <MinusIcon className="fk:mr-2 fk:h-4 fk:w-4" /> Remove tag
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBatchDelete} className="fk:text-destructive">
                <Trash2Icon className="fk:mr-2 fk:h-4 fk:w-4" /> Delete asset{selectedIds.length > 1 ? 's' : ''} (
                {selectedIds.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
      <div className="fk:ml-auto fk:flex fk:items-center fk:gap-2">
        <ToggleGroup
          size="sm"
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value === 'list' || value === 'grid') {
              onViewModeChange(value);
            }
          }}
        >
          <ToggleGroupItem aria-label="Grid view" value="grid">
            <LayoutGrid className="fk:h-4 fk:w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="List view" value="list">
            <List className="fk:h-4 fk:w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button className="fk:h-8 fk:lg:flex" onClick={handleUpload} size="sm" variant="default">
          Upload assets
        </Button>
      </div>

      {tagDialogMode !== null ? (
        <AssetTagDialogs
          assetIds={selectedIds}
          mode={tagDialogMode}
          onCompleted={() => table.resetRowSelection()}
          onModeChange={setTagDialogMode}
        />
      ) : null}
    </div>
  );
}

function debounce<TArgs extends unknown[]>(fn: (...args: TArgs) => void, ms = 300) {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function (this: unknown, ...args: TArgs) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}
