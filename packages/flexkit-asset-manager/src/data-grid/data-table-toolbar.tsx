'use client';

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
  X as ResetIcon,
} from 'lucide-react';
import type { ReactTable } from '@flexkit/studio';
import { Button, Input } from '@flexkit/studio/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@flexkit/studio/ui';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
  CommandSeparator,
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
  tagSchema,
  useConfig,
} from '@flexkit/studio';
import { useCallback, useMemo, useState } from 'react';
import { getEntityUpdateMutation } from '../../../flexkit-studio/src/graphql-client/queries';

interface DataTableToolbarProps<TData> {
  entityName: string;
  table: ReactTable<TData>;
}

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

export function DataTableToolbar<TData>({ entityName, table }: DataTableToolbarProps<TData>): JSX.Element {
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
    } as unknown as Record<string, unknown>;

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
    } as unknown as Record<string, unknown>;

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

  return (
    <div className="fk-flex fk-items-center fk-justify-between">
      <div className="fk-flex fk-flex-1 fk-items-center fk-space-x-2">
        <Input
          placeholder="Filter tasks..."
          // value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
          // onChange={(event) => table.getColumn('title')?.setFilterValue(event.target.value)}
          className="fk-h-8 fk-w-[150px] lg:fk-w-[250px]"
        />
        {table.getColumn('mimeType') && (
          <DataTableFacetedFilter column={table.getColumn('mimeType')} title="File type" options={mimeTypes} />
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="fk-h-8 fk-px-2 lg:fk-px-3">
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
        <CommandList>
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
          <CommandSeparator />
          <div className="fk-p-2">
            <Button className="fk-w-full" onClick={handleAddTagsToSelected} disabled={selectedTagIds.length === 0}>
              Add tag(s) to selected assets
            </Button>
          </div>
        </CommandList>
      </CommandDialog>

      <CommandDialog open={isRemoveTagDialogOpen} onOpenChange={setIsRemoveTagDialogOpen}>
        <CommandInput placeholder="Search tags..." />
        <CommandList>
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
        </CommandList>
      </CommandDialog>
    </div>
  );
}
