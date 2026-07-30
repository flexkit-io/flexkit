import { useState, type JSX } from 'react';
import {
  Check as CheckIcon,
  Copy as CopyIcon,
  Ellipsis as EllipsisIcon,
  Link as LinkIcon,
  MinusIcon,
  TagIcon,
  Trash2 as Trash2Icon,
} from 'lucide-react';
import { assetSchema, IMAGES_BASE_URL, useDispatch } from '@flexkit/studio';
import type { Row } from '@flexkit/studio';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@flexkit/studio/ui';
import { AssetTagDialogs, type AssetTagDialogMode } from './asset-tag-dialogs';

type AssetRow = {
  _id?: string;
  path?: string | null;
};

interface AssetRowActionsProps<TData> {
  row: Row<TData>;
}

export function AssetRowActions<TData>({ row }: AssetRowActionsProps<TData>): JSX.Element {
  const [copiedField, setCopiedField] = useState<'id' | 'url' | null>(null);
  const [tagDialogMode, setTagDialogMode] = useState<AssetTagDialogMode>(null);
  const dispatch = useDispatch();
  const asset = row.original as AssetRow;
  const assetId = asset._id ?? '';
  const assetPath = asset.path ?? '';

  function handleDelete(): void {
    dispatch({ type: 'DeleteEntity', payload: { entityId: assetId, entityName: assetSchema.name } });
  }

  function copyToClipboard(field: 'id' | 'url', text: string): void {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1500);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="fk:flex fk:h-8 fk:w-8 fk:p-0 fk:data-[state=open]:bg-muted"
            onClick={(event) => event.stopPropagation()}
            variant="ghost"
          >
            <EllipsisIcon className="fk:h-4 fk:w-4" />
            <span className="fk:sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="fk:w-45">
          <DropdownMenuItem
            disabled={!assetId}
            onClick={(event) => {
              event.stopPropagation();
              copyToClipboard('id', assetId);
            }}
          >
            {copiedField === 'id' ? (
              <CheckIcon className="fk:mr-2 fk:h-4 fk:w-4" />
            ) : (
              <CopyIcon className="fk:mr-2 fk:h-4 fk:w-4" />
            )}
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!assetPath}
            onClick={(event) => {
              event.stopPropagation();
              copyToClipboard('url', `${IMAGES_BASE_URL}${assetPath}`);
            }}
          >
            {copiedField === 'url' ? (
              <CheckIcon className="fk:mr-2 fk:h-4 fk:w-4" />
            ) : (
              <LinkIcon className="fk:mr-2 fk:h-4 fk:w-4" />
            )}
            Copy URL
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!assetId}
            onClick={(event) => {
              event.stopPropagation();
              setTagDialogMode('add');
            }}
          >
            <TagIcon className="fk:mr-2 fk:h-4 fk:w-4" />
            Add tag
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!assetId}
            onClick={(event) => {
              event.stopPropagation();
              setTagDialogMode('remove');
            }}
          >
            <MinusIcon className="fk:mr-2 fk:h-4 fk:w-4" />
            Remove tag
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="fk:text-destructive"
            disabled={!assetId}
            onClick={(event) => {
              event.stopPropagation();
              handleDelete();
            }}
          >
            <Trash2Icon className="fk:mr-2 fk:h-4 fk:w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {tagDialogMode !== null ? (
        <AssetTagDialogs
          assetIds={assetId ? [assetId] : []}
          mode={tagDialogMode}
          onModeChange={setTagDialogMode}
        />
      ) : null}
    </>
  );
}
