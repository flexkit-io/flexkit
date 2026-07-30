'use client';

import { useCallback, useMemo, useState, type JSX } from 'react';
import { LoaderCircle } from 'lucide-react';
import {
  Button,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@flexkit/studio/ui';
import {
  gql,
  getEntityUpdateMutation,
  useAppContext,
  useConfig,
  useEntityMutation,
  useEntityQuery,
  usePatchEntityList,
} from '@flexkit/studio';

type TagItem = {
  _id: string;
  name: string;
};

type WhereClause = { [key: string]: unknown };

type AssetTagMutationAsset = {
  _id?: string;
  _updatedAt?: string;
  tags?: TagItem[] | null;
};

type AssetTagMutationData = {
  update_assets?: {
    _assets?: AssetTagMutationAsset[] | null;
  } | null;
};

export type AssetTagDialogMode = 'add' | 'remove' | null;

const TAG_UPDATE_RESPONSE_FIELDS = `_updatedAt
      tags(limit: 3, offset: 0) {
        _id
        name
      }
`;

interface AssetTagDialogsProps {
  assetIds: string[];
  mode: AssetTagDialogMode;
  onModeChange: (mode: AssetTagDialogMode) => void;
  onCompleted?: () => void;
}

export function AssetTagDialogs({
  assetIds,
  mode,
  onModeChange,
  onCompleted,
}: AssetTagDialogsProps): JSX.Element {
  const { scope } = useAppContext();
  const patchAssets = usePatchEntityList('_assets');
  const [runMutation, setMutation, setOptions] = useEntityMutation();
  const { currentProjectSchema: schema } = useConfig();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tagsQueryVariables = useMemo(() => ({ where: {}, limit: 500, offset: 0, sort: [{ name: 'ASC' }] }), []);

  const { data: tagsData } = useEntityQuery({
    entityNamePlural: '_tags',
    schema,
    scope,
    variables: tagsQueryVariables,
    selection: 'list',
  });

  const allTags = useMemo(() => {
    const items = Array.isArray(tagsData) ? (tagsData as unknown[]) : [];

    return items.map((tag) => ({
      _id: (tag as TagItem)._id,
      name: (tag as TagItem).name,
    }));
  }, [tagsData]);

  const resetSelection = useCallback((): void => {
    setSelectedTagIds([]);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean): void => {
      if (!open && !isSubmitting) {
        onModeChange(null);
        resetSelection();
      }
    },
    [isSubmitting, onModeChange, resetSelection]
  );

  const applyMutationResult = useCallback(
    (data: unknown): void => {
      const assets = (data as AssetTagMutationData | null | undefined)?.update_assets?._assets ?? [];
      const patches = assets
        .filter((asset): asset is AssetTagMutationAsset & { _id: string } => typeof asset?._id === 'string')
        .map((asset) => {
          const tagNames = (Array.isArray(asset.tags) ? asset.tags : [])
            .map((tag) => tag.name)
            .filter(Boolean)
            .slice(0, 3)
            .join(', ');

          return {
            _id: asset._id,
            attributes: {
              tags: tagNames,
              ...(typeof asset._updatedAt === 'string' ? { _updatedAt: asset._updatedAt } : {}),
            },
          };
        });

      if (patches.length > 0) {
        patchAssets(patches);
      }
    },
    [patchAssets]
  );

  const handleAddTags = useCallback(async (): Promise<void> => {
    if (assetIds.length === 0 || selectedTagIds.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToMutate = {
        tags: {
          relationships: {
            connect: selectedTagIds.map((id) => ({ _id: id })),
          },
          disabled: false,
          scope,
        },
      } as unknown as WhereClause;

      const mutation = getEntityUpdateMutation(
        '_assets',
        assetIds[0] ?? '',
        scope,
        schema,
        {},
        dataToMutate as never,
        { responseFields: TAG_UPDATE_RESPONSE_FIELDS }
      );

      await new Promise<void>((resolve, reject) => {
        setMutation(gql`
          ${mutation}
        `);
        setOptions({
          variables: { where: { _id: { in: assetIds } } },
          onCompleted: (data: unknown) => {
            applyMutationResult(data);
            resolve();
          },
          onError: (error: Error) => reject(error),
        });
        runMutation(true);
      });

      onCompleted?.();
      resetSelection();
      onModeChange(null);
    } catch {
      // Keep the dialog open so the user can retry.
    } finally {
      setIsSubmitting(false);
    }
  }, [
    applyMutationResult,
    assetIds,
    isSubmitting,
    onCompleted,
    onModeChange,
    resetSelection,
    runMutation,
    schema,
    scope,
    selectedTagIds,
    setMutation,
    setOptions,
  ]);

  const handleRemoveTags = useCallback(async (): Promise<void> => {
    if (assetIds.length === 0 || selectedTagIds.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToMutate = {
        tags: {
          relationships: {
            disconnect: selectedTagIds,
          },
          disabled: false,
          scope,
        },
      } as unknown as WhereClause;

      const mutation = getEntityUpdateMutation(
        '_assets',
        assetIds[0] ?? '',
        scope,
        schema,
        {},
        dataToMutate as never,
        { responseFields: TAG_UPDATE_RESPONSE_FIELDS }
      );

      await new Promise<void>((resolve, reject) => {
        setMutation(gql`
          ${mutation}
        `);
        setOptions({
          variables: { where: { _id: { in: assetIds } } },
          onCompleted: (data: unknown) => {
            applyMutationResult(data);
            resolve();
          },
          onError: (error: Error) => reject(error),
        });
        runMutation(true);
      });

      onCompleted?.();
      resetSelection();
      onModeChange(null);
    } catch {
      // Keep the dialog open so the user can retry.
    } finally {
      setIsSubmitting(false);
    }
  }, [
    applyMutationResult,
    assetIds,
    isSubmitting,
    onCompleted,
    onModeChange,
    resetSelection,
    runMutation,
    schema,
    scope,
    selectedTagIds,
    setMutation,
    setOptions,
  ]);

  const isRemove = mode === 'remove';
  let actionLabel = isRemove ? 'Remove tag(s)' : 'Add tag(s)';

  if (assetIds.length > 1) {
    actionLabel = isRemove ? 'Remove tag(s) from selected assets' : 'Add tag(s) to selected assets';
  }

  return (
    <CommandDialog open={mode !== null} onOpenChange={handleOpenChange}>
      <CommandInput placeholder="Search tags..." />
      <CommandList className="fk:h-75">
        <CommandEmpty>No tags found.</CommandEmpty>
        <CommandGroup heading="Tags">
          {allTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag._id);

            return (
              <CommandItem
                disabled={isSubmitting}
                key={tag._id}
                onSelect={() => {
                  if (isSubmitting) {
                    return;
                  }

                  setSelectedTagIds((prev) =>
                    isSelected ? prev.filter((id) => id !== tag._id) : [...prev, tag._id]
                  );
                }}
              >
                <input className="fk:mr-2" checked={isSelected} onChange={() => {}} type="checkbox" />
                {tag.name}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
      <CommandSeparator />
      <div className="fk:p-2">
        <Button
          className="fk:w-full"
          disabled={selectedTagIds.length === 0 || isSubmitting}
          onClick={isRemove ? handleRemoveTags : handleAddTags}
        >
          {isSubmitting ? <LoaderCircle className="fk:mr-2 fk:h-4 fk:w-4 fk:animate-spin" /> : null}
          {actionLabel}
        </Button>
      </div>
    </CommandDialog>
  );
}
