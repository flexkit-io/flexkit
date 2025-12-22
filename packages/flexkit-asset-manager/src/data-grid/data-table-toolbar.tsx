'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FilePlayIcon,
  ImageIcon,
  ImagePlayIcon,
  LayersIcon,
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
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
  CommandSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@flexkit/studio/ui';
import {
  DataTableFacetedFilter,
  useParams,
  useUploadAssets,
  useDispatch,
  useEntityQuery,
  useEntityMutation,
  useAppContext,
  gql,
  useConfig,
  getEntityUpdateMutation,
  useSearch,
} from '@flexkit/studio';

interface DataTableToolbarProps<TData> {
  entityName: string;
  table: ReactTable<TData>;
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
  onSearchWhereChange,
}: DataTableToolbarProps<TData>): JSX.Element {
  const isFiltered = table.getState().columnFilters.length > 0;
  const { projectId } = useParams();
  const uploadAssets = useUploadAssets();
  const dispatch = useDispatch();
  const { scope } = useAppContext();
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isRemoveTagDialogOpen, setIsRemoveTagDialogOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedRemoveTagIds, setSelectedRemoveTagIds] = useState<string[]>([]);
  const [runMutation, setMutation, setOptions] = useEntityMutation();
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

  const debouncedSetSearchQuery = useCallback(
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

  // Load tags for the selector
  const { data: tagsData } = useEntityQuery({
    entityNamePlural: '_tags',
    schema,
    scope,
    variables: { where: {}, options: { limit: 500, offset: 0, sort: [{ name: 'ASC' }] } },
  });
  const allTags = Array.isArray(tagsData)
    ? (tagsData as unknown[]).map((t) => ({ _id: (t as { _id: string })._id, name: (t as { name: string }).name }))
    : [];

  // Load a sample of assets to derive dynamic mime type options
  const { data: mimeSampleData } = useEntityQuery({
    entityNamePlural: '_assets',
    schema,
    scope,
    variables: { where: {}, options: { limit: 500, offset: 0, sort: [{ _updatedAt: 'DESC' }] } },
  });

  type AssetItem = { _id: string; mimeType?: string | null };

  function getMimeLabel(mime: string): string {
    if (mime === 'image/gif') {
      return 'GIF';
    }

    if (mime === 'image/jpeg') {
      return 'JPEG';
    }

    if (mime === 'video/mp4') {
      return 'MP4';
    }

    if (mime === 'image/png') {
      return 'PNG';
    }

    if (mime === 'image/svg+xml') {
      return 'SVG';
    }

    if (mime === 'image/webp') {
      return 'WebP';
    }

    const parts = mime.split('/');

    if (parts.length === 2 && parts[1]) {
      return parts[1].toUpperCase();
    }

    return mime;
  }

  function getMimeIcon(mime: string) {
    if (mime === 'image/svg+xml') {
      return SplinePointerIcon;
    }

    if (mime.startsWith('image/')) {
      return ImageIcon;
    }

    if (mime.startsWith('video/')) {
      return FilePlayIcon;
    }

    return LayersIcon;
  }

  const dynamicMimeOptions = useMemo(() => {
    const items = Array.isArray(mimeSampleData) ? (mimeSampleData as unknown as AssetItem[]) : [];
    const unique = new Set<string>();

    for (const item of items) {
      const value = item.mimeType ?? '';

      if (value) {
        unique.add(value);
      }
    }

    const values = Array.from(unique.values()).sort();

    return values.map((value) => ({ value, label: getMimeLabel(value), icon: getMimeIcon(value) }));
  }, [mimeSampleData]);

  const mimeTypeOptions = dynamicMimeOptions.length > 0 ? dynamicMimeOptions : mimeTypes;

  const tagOptions = useMemo(() => {
    return allTags.map((t) => ({ value: t._id, label: t.name }));
  }, [allTags]);

  function emitCombinedWhere(): void {
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
  }

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
            for (const id of selectedIds) {
              const payload = { entityId: id, entityName, silent: true } as unknown as {
                entityId: string;
                entityName: string;
              };
              dispatch({ type: 'DeleteEntity', payload });
            }

            table.resetRowSelection();
          },
        },
      },
    });
  }

  const handleAddTagsToSelected = useCallback(async (): Promise<void> => {
    if (selectedIds.length === 0 || selectedTagIds.length === 0) {
      return;
    }

    // Build relationship connect for multiple tags
    const dataToMutate = {
      tags: {
        relationships: {
          connect: selectedTagIds.map((id) => ({ _id: id })),
        },
        disabled: false,
        scope,
      },
    } as unknown as WhereClause;

    const mutation = getEntityUpdateMutation('_assets', selectedIds[0] ?? '', scope, schema, {}, dataToMutate as never);

    await new Promise<void>((resolve) => {
      setMutation(gql`
        ${mutation}
      `);
      setOptions({
        variables: { where: { _id_IN: selectedIds } },
        onCompleted: () => resolve(),
      });
      runMutation(true);
    });

    setIsTagDialogOpen(false);
    setSelectedTagIds([]);
    table.resetRowSelection();
  }, [runMutation, scope, selectedIds, selectedTagIds, setMutation, setOptions, table]);

  const handleRemoveTagsFromSelected = useCallback(async (): Promise<void> => {
    if (selectedIds.length === 0 || selectedRemoveTagIds.length === 0) {
      return;
    }

    const dataToMutate = {
      tags: {
        relationships: {
          disconnect: selectedRemoveTagIds,
        },
        disabled: false,
        scope,
      },
    } as unknown as WhereClause;

    const mutation = getEntityUpdateMutation('_assets', selectedIds[0] ?? '', scope, schema, {}, dataToMutate as never);

    await new Promise<void>((resolve) => {
      setMutation(gql`
        ${mutation}
      `);
      setOptions({
        variables: { where: { _id_IN: selectedIds } },
        onCompleted: () => resolve(),
      });
      runMutation(true);
    });

    setIsRemoveTagDialogOpen(false);
    setSelectedRemoveTagIds([]);
    table.resetRowSelection();
  }, [runMutation, scope, selectedIds, selectedRemoveTagIds, setMutation, setOptions, table]);

  useEffect(() => {
    if (!onSearchWhereChange) {
      return;
    }

    const safeResults = results ?? [];
    const trimmed = search.trim();

    let nextWhere: WhereClause = {};

    if (trimmed.length === 0) {
      nextWhere = {};
    } else if (safeResults.length === 0) {
      nextWhere = { _id_IN: [] };
    } else {
      const assetIdClauses = safeResults.filter((r) => r._entityNamePlural === '_assets').map((r) => ({ _id: r._id }));

      const tagClauses = safeResults
        .filter((r) => r._entityNamePlural === '_tags')
        .map((r) => ({ tagsConnection_SOME: { node: { _id: r._id } } }));

      const orClauses = [...assetIdClauses, ...tagClauses];
      nextWhere = orClauses.length > 0 ? { OR: orClauses } : { _id_IN: [] };
    }

    textWhereRef.current = nextWhere;
    emitCombinedWhere();
  }, [onSearchWhereChange, results, search]);

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
      clauses.push({ mimeType_IN: mimeValues } as WhereClause);
    }

    if (tagValues.length > 0) {
      const orTags = tagValues.map((id) => ({ tagsConnection_SOME: { node: { _id: id } } }));
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
  }, [columnFiltersKey, onSearchWhereChange, table]);

  return (
    <div className="fk-flex fk-items-center fk-justify-between">
      <div className="fk-flex fk-flex-1 fk-items-center fk-space-x-2">
        <div className="fk-relative">
          {isLoading ? (
            <LoaderCircle className="fk-absolute fk-left-2 fk-top-2 fk-h-4 fk-w-4 fk-shrink-0 fk-opacity-50 fk-animate-spin" />
          ) : (
            <SearchIcon className="fk-absolute fk-left-2 fk-top-2 fk-h-4 fk-w-4 fk-shrink-0 fk-opacity-50" />
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

                if (onSearchWhereChange) {
                  onSearchWhereChange({});
                }

                return;
              }

              debouncedSetSearchQuery(value);
            }}
            className="fk-h-8 fk-w-[150px] lg:fk-w-[250px] fk-pl-8"
          />
          {search ? (
            <button
              aria-label="Clear search"
              className="fk-absolute fk-right-2 fk-top-2 fk-text-muted-foreground hover:fk-text-foreground"
              onClick={() => {
                setSearch('');
                setSearchQuery({ ...baseSearchRequest, commonParams: { q: '' } });
                if (onSearchWhereChange) {
                  onSearchWhereChange({});
                }
              }}
              type="button"
            >
              <ResetIcon className="fk-h-4 fk-w-4" />
            </button>
          ) : null}
        </div>
        {table.getColumn('mimeType') && (
          <DataTableFacetedFilter column={table.getColumn('mimeType')} title="File type" options={mimeTypeOptions} />
        )}
        {table.getColumn('tags') && (
          <DataTableFacetedFilter column={table.getColumn('tags')} title="Tags" options={tagOptions} />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();

              if (onSearchWhereChange) {
                onSearchWhereChange({});
              }
            }}
            className="fk-h-8 fk-px-2 lg:fk-px-3"
          >
            Reset
            <ResetIcon className="fk-ml-2 fk-h-4 fk-w-4" />
          </Button>
        )}
      </div>
      {selectedIds.length > 0 ? (
        <div className="fk-flex fk-items-center fk-gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="fk-h-8 fk-mr-2 lg:fk-flex" size="sm" variant="secondary">
                Actions <ListChecks className="fk-ml-2 fk-h-4 fk-w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="fk-w-[240px]">
              <DropdownMenuItem onClick={() => setIsTagDialogOpen(true)}>
                <TagIcon className="fk-mr-2 fk-h-4 fk-w-4" /> Add tag
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsRemoveTagDialogOpen(true)}>
                <MinusIcon className="fk-mr-2 fk-h-4 fk-w-4" /> Remove tag
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBatchDelete} className="fk-text-destructive">
                <Trash2Icon className="fk-mr-2 fk-h-4 fk-w-4" /> Delete asset{selectedIds.length > 1 ? 's' : ''} (
                {selectedIds.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
      <Button className="fk-ml-auto fk-h-8 lg:fk-flex" onClick={handleUpload} size="sm" variant="default">
        Upload assets
      </Button>

      <CommandDialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <CommandInput placeholder="Search tags..." />
        <CommandList className="fk-h-[300px]">
          <CommandEmpty>No tags found.</CommandEmpty>
          <CommandGroup heading="Tags">
            {allTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag._id);
              return (
                <CommandItem
                  key={tag._id}
                  onSelect={() => {
                    setSelectedTagIds((prev) =>
                      isSelected ? prev.filter((id) => id !== tag._id) : [...prev, tag._id]
                    );
                  }}
                >
                  <input className="fk-mr-2" checked={isSelected} onChange={() => {}} type="checkbox" />
                  {tag.name}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
        <CommandSeparator />
        <div className="fk-p-2">
          <Button className="fk-w-full" onClick={handleAddTagsToSelected} disabled={selectedTagIds.length === 0}>
            Add tag(s) to selected assets
          </Button>
        </div>
      </CommandDialog>

      <CommandDialog open={isRemoveTagDialogOpen} onOpenChange={setIsRemoveTagDialogOpen}>
        <CommandInput placeholder="Search tags..." />
        <CommandList className="fk-h-[300px]">
          <CommandEmpty>No tags found.</CommandEmpty>
          <CommandGroup heading="Tags">
            {allTags.map((tag) => {
              const isSelected = selectedRemoveTagIds.includes(tag._id);
              return (
                <CommandItem
                  key={tag._id}
                  onSelect={() => {
                    setSelectedRemoveTagIds((prev) =>
                      isSelected ? prev.filter((id) => id !== tag._id) : [...prev, tag._id]
                    );
                  }}
                >
                  <input className="fk-mr-2" checked={isSelected} onChange={() => {}} type="checkbox" />
                  {tag.name}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
        <CommandSeparator />
        <div className="fk-p-2">
          <Button
            className="fk-w-full"
            onClick={handleRemoveTagsFromSelected}
            disabled={selectedRemoveTagIds.length === 0}
          >
            Remove tag(s) from selected assets
          </Button>
        </div>
      </CommandDialog>
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
