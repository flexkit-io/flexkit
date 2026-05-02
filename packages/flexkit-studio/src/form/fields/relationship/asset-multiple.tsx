import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowDown as ArrowDownIcon,
  ArrowUp as ArrowUpIcon,
  Image as ImageIcon,
  Link,
  Maximize2,
  Upload as UploadIcon,
  X as ClearIcon,
} from 'lucide-react';
import { useDispatch } from '../../../entities/actions-context';
import { useAppContext, useAppDispatch } from '../../../core/app-context';
import { IMAGES_BASE_URL } from '../../../core/api-paths';
import { useUploadAssets } from '../../../core/upload';
import type { MultipleRelationshipConnection } from '../../../core/types';
import type { OrderedAssetValue } from '../../../graphql-client/types';
import { Button } from '../../../ui/primitives/button';
import { Collapsible, CollapsibleContent } from '../../../ui/primitives/collapsible';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../../../ui/primitives/form';
import { ScrollArea } from '../../../ui/primitives/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/primitives/tooltip';
import { useOuterClick } from '../../../ui/hooks/use-outer-click';
import type { FormFieldParams } from '../../types';

export default function AssetMultipleRelationship({
  control,
  defaultValue,
  entityId,
  fieldSchema,
  setValue,
}: FormFieldParams<'relationship'>): JSX.Element {
  const { name, label, options, relationship } = fieldSchema;
  const { projectId } = useParams();
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const { relationships } = useAppContext();
  const uploadAssets = useUploadAssets();
  const fieldId = useId();
  const relationshipId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const originalAssetIdsRef = useRef<string[]>([]);
  const pendingLocalRowsSignatureRef = useRef<string | null>(null);
  const removedAssetIdsRef = useRef<string[]>([]);
  const syncedRowsSignatureRef = useRef('');
  const [isOpen, setIsOpen] = useState(false);
  const initialRows = useMemo(() => normalizeAssets(defaultValue.value), [defaultValue.value]);
  const [rows, setRows] = useState<OrderedAssetValue[]>(initialRows);
  useOuterClick(wrapperRef, setIsOpen);

  useEffect(() => {
    const initialRowsSignature = getRowsSignature(initialRows);

    originalAssetIdsRef.current = initialRows.map((asset) => asset._id);
    removedAssetIdsRef.current = [];

    setRows((currentRows) => {
      const currentRowsSignature = getRowsSignature(currentRows);

      if (
        initialRowsSignature === '' &&
        currentRowsSignature !== '' &&
        syncedRowsSignatureRef.current === currentRowsSignature
      ) {
        return currentRows;
      }

      if (currentRowsSignature === initialRowsSignature) {
        return currentRows;
      }

      syncedRowsSignatureRef.current = initialRowsSignature;

      return initialRows;
    });
  }, [initialRows]);

  useEffect(() => {
    const connections = relationships[relationshipId]?.connect as MultipleRelationshipConnection | undefined;

    if (!connections) {
      return;
    }

    const selectedAssets = connections
      .map((connection, index) => normalizeAsset(connection.value, connection.sortOrder ?? index))
      .filter((asset): asset is OrderedAssetValue => Boolean(asset));
    const selectedRowsSignature = getRowsSignature(selectedAssets);
    const rowsSignature = getRowsSignature(rows);
    const pendingRowsSignature = pendingLocalRowsSignatureRef.current;

    if (pendingRowsSignature === rowsSignature && selectedRowsSignature !== pendingRowsSignature) {
      return;
    }

    pendingLocalRowsSignatureRef.current = null;

    if (selectedRowsSignature !== rowsSignature) {
      setRows(selectedAssets);
    }
  }, [relationshipId, relationships, rows]);

  useEffect(() => {
    const rowsSignature = getRowsSignature(rows);

    if (syncedRowsSignatureRef.current === rowsSignature) {
      return;
    }

    const connect = rows.map((asset, index) => ({
      _id: asset._id,
      sortOrder: index,
      value: {
        ...asset,
        sortOrder: index,
      },
    }));
    const rowIds = rows.map((asset) => asset._id);
    const disconnect = removedAssetIdsRef.current.filter((_id) => !rowIds.includes(_id));

    syncedRowsSignatureRef.current = rowsSignature;

    appDispatch({
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect,
          disconnect,
        },
      },
    });

    setValue(name, {
      ...defaultValue,
      relationships: {
        connect,
        disconnect,
      },
      value: rows,
    });
  }, [appDispatch, defaultValue, name, relationshipId, rows, setValue]);

  function handleSelection(event: SyntheticEvent): void {
    event.preventDefault();
    event.stopPropagation();

    actionDispatch({
      type: 'EditRelationship',
      payload: {
        connectedEntitiesCount: rows.length,
        entityName: relationship?.entity ?? '_asset',
        entityId,
        relationshipId,
        mode: 'multiple',
        assetAccept: options?.accept,
      },
    });
  }

  async function handleUpload(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const uploadedAssets = await uploadAssets({
      projectId,
      accept: options?.accept ?? 'image/*',
      multiple: true,
      maxBytes: 4 * 1024 * 1024,
    });

    setRows((currentRows) => {
      const currentIds = new Set(currentRows.map((asset) => asset._id));
      const nextAssets = uploadedAssets
        .map((uploaded, index) => ({
          ...uploaded.asset,
          sortOrder: currentRows.length + index,
        }))
        .filter((asset) => !currentIds.has(asset._id));
      const nextRows = withSortOrder([...currentRows, ...nextAssets]);

      pendingLocalRowsSignatureRef.current = getRowsSignature(nextRows);

      return nextRows;
    });
  }

  function removeAsset(assetId: string): void {
    setRows((currentRows) => {
      const nextRows = withSortOrder(currentRows.filter((asset) => asset._id !== assetId));

      if (originalAssetIdsRef.current.includes(assetId) && !removedAssetIdsRef.current.includes(assetId)) {
        removedAssetIdsRef.current = [...removedAssetIdsRef.current, assetId];
      }

      pendingLocalRowsSignatureRef.current = getRowsSignature(nextRows);

      return nextRows;
    });
  }

  function moveAsset(assetId: string, direction: -1 | 1): void {
    setRows((currentRows) => {
      const currentIndex = currentRows.findIndex((asset) => asset._id === assetId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentRows.length) {
        return currentRows;
      }

      const nextRows = [...currentRows];
      const [asset] = nextRows.splice(currentIndex, 1);

      if (!asset) {
        return currentRows;
      }

      nextRows.splice(nextIndex, 0, asset);

      const sortedRows = withSortOrder(nextRows);

      pendingLocalRowsSignatureRef.current = getRowsSignature(sortedRows);

      return sortedRows;
    });
  }

  return (
    <FormField
      control={control}
      defaultValue={defaultValue}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel htmlFor={fieldId}>{label}</FormLabel>
          {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl className="fk-flex fk-flex-col fk-w-full fk-min-h-[2.375rem] fk-text-sm">
            <div
              aria-controls={`asset-relationship-dropdown-${name}`}
              aria-expanded={isOpen}
              className={`fk-relative fk-flex fk-w-full fk-items-start fk-space-x-2 fk-rounded-md fk-border fk-border-input fk-bg-background fk-px-2.5 fk-py-0.5 focus-visible:fk-outline-none fk-ring-offset-background focus-visible:fk-ring-2 focus-visible:fk-ring-ring focus-visible:fk-ring-offset-2 ${
                isOpen ? 'fk-outline-none fk-ring-2 fk-ring-ring fk-ring-offset-2' : ''
              }`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                wrapperRef.current?.focus();
                setIsOpen(true);
              }}
              ref={wrapperRef}
              role="combobox"
              tabIndex={0}
            >
              <div className="fk-flex fk-w-full fk-flex-col">
                <div className="fk-flex fk-w-full fk-items-center fk-gap-2 fk-pr-9">
                  {isOpen && rows.length > 0 ? (
                    <div className="fk-flex fk-h-9 fk-items-center fk-text-muted-foreground">
                      {rows.length} {rows.length === 1 ? 'asset' : 'assets'} selected
                    </div>
                  ) : rows.length > 0 ? (
                    <div className="fk-flex fk-min-h-9 fk-flex-wrap fk-gap-2">
                      {rows.slice(0, 8).map((asset) => (
                        <AssetThumbnail asset={asset} key={asset._id} />
                      ))}
                      {!isOpen && rows.length > 8 ? (
                        <div className="fk-flex fk-h-9 fk-w-9 fk-items-center fk-justify-center fk-rounded fk-bg-muted fk-text-xs fk-text-muted-foreground">
                          +{rows.length - 8}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="fk-flex fk-h-9 fk-items-center fk-text-muted-foreground">
                      <ImageIcon className="fk-mr-2 fk-h-4 fk-w-4" />
                      Select or upload assets
                    </div>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="fk-absolute fk-right-[0.1875rem] fk-top-[0.1875rem] fk-h-8 fk-w-8 fk-rounded fk-text-muted-foreground"
                          id={fieldId}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsOpen((value) => !value);
                          }}
                          size="icon"
                          variant="ghost"
                        >
                          {isOpen ? <ClearIcon className="fk-h-4 fk-w-4" /> : <Maximize2 className="fk-h-4 fk-w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isOpen ? 'Close' : 'Expand field'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Collapsible className="fk-w-full fk-space-y-2 !fk-ml-0" onOpenChange={setIsOpen} open={isOpen}>
                  <CollapsibleContent className="fk-w-full">
                    <div className="fk-flex fk-flex-col fk-gap-3" id={`asset-relationship-dropdown-${name}`}>
                      <div className="fk-flex fk-gap-2">
                        <Button className="fk-h-8" onClick={handleSelection} variant="outline">
                          <Link className="fk-h-4 fk-w-4 fk-mr-2" />
                          Select assets
                        </Button>
                        <Button className="fk-h-8" onClick={(event) => void handleUpload(event)} variant="outline">
                          <UploadIcon className="fk-h-4 fk-w-4 fk-mr-2" />
                          Upload assets
                        </Button>
                      </div>
                      {rows.length > 0 ? (
                        <ScrollArea className="fk-h-[28rem]">
                          <div className="fk-grid fk-grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] fk-gap-3 fk-pr-3">
                            {rows.map((asset, index) => (
                              <SelectedAssetCard
                                asset={asset}
                                index={index}
                                isFirst={index === 0}
                                isLast={index === rows.length - 1}
                                key={asset._id}
                                moveAsset={moveAsset}
                                removeAsset={removeAsset}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function AssetThumbnail({ asset }: { asset: OrderedAssetValue }): JSX.Element {
  const isImage = isImageAsset(asset);

  if (!isImage) {
    return (
      <div className="fk-flex fk-h-9 fk-w-9 fk-items-center fk-justify-center fk-rounded fk-bg-muted">
        <ImageIcon className="fk-h-4 fk-w-4 fk-text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      alt={asset.originalFilename || 'Asset'}
      className="fk-h-9 fk-w-9 fk-rounded fk-bg-muted fk-object-cover"
      src={`${IMAGES_BASE_URL}${asset.path}?w=128&h=128&f=webp`}
    />
  );
}

function SelectedAssetCard({
  asset,
  index,
  isFirst,
  isLast,
  moveAsset,
  removeAsset,
}: {
  asset: OrderedAssetValue;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  moveAsset: (assetId: string, direction: -1 | 1) => void;
  removeAsset: (assetId: string) => void;
}): JSX.Element {
  return (
    <div className="fk-relative fk-rounded-md fk-border fk-border-input fk-bg-background fk-p-2">
      <div className="fk-aspect-square fk-overflow-hidden fk-rounded fk-bg-muted">
        {isImageAsset(asset) ? (
          <img
            alt={asset.originalFilename || 'Asset'}
            className="fk-h-full fk-w-full fk-object-cover"
            src={`${IMAGES_BASE_URL}${asset.path}?w=320&h=320&f=webp`}
          />
        ) : (
          <div className="fk-flex fk-h-full fk-w-full fk-items-center fk-justify-center">
            <ImageIcon className="fk-h-8 fk-w-8 fk-text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="fk-mt-2 fk-truncate fk-text-xs" title={asset.originalFilename}>
        {index + 1}. {asset.originalFilename || asset.path}
      </div>
      <div className="fk-mt-2 fk-flex fk-gap-1">
        <Button
          className="fk-h-7 fk-w-7"
          disabled={isFirst}
          onClick={() => moveAsset(asset._id, -1)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowUpIcon className="fk-h-3.5 fk-w-3.5" />
        </Button>
        <Button
          className="fk-h-7 fk-w-7"
          disabled={isLast}
          onClick={() => moveAsset(asset._id, 1)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowDownIcon className="fk-h-3.5 fk-w-3.5" />
        </Button>
        <Button
          className="fk-ml-auto fk-h-7 fk-w-7"
          onClick={() => removeAsset(asset._id)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ClearIcon className="fk-h-3.5 fk-w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function normalizeAssets(value: unknown): OrderedAssetValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => normalizeAsset(item, index))
    .filter((asset): asset is OrderedAssetValue => Boolean(asset))
    .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
}

function getRowsSignature(rows: OrderedAssetValue[]): string {
  return rows.map((asset, index) => `${asset._id}:${asset.sortOrder ?? index}`).join('|');
}

function withSortOrder(rows: OrderedAssetValue[]): OrderedAssetValue[] {
  return rows.map((row, index) => ({ ...row, sortOrder: index }));
}

function normalizeAsset(value: unknown, sortOrder: number): OrderedAssetValue | null {
  if (!value || typeof value !== 'object' || !('_id' in value) || !('path' in value)) {
    return null;
  }

  const asset = value as Partial<OrderedAssetValue>;

  return {
    _id: String(asset._id ?? ''),
    path: String(asset.path ?? ''),
    originalFilename: String(asset.originalFilename ?? ''),
    size: Number(asset.size ?? 0),
    mimeType: String(asset.mimeType ?? ''),
    lqip: String(asset.lqip ?? ''),
    width: Number(asset.width ?? 0),
    height: Number(asset.height ?? 0),
    sortOrder: asset.sortOrder ?? sortOrder,
  };
}

function isImageAsset(asset: OrderedAssetValue): boolean {
  return Boolean(
    (asset.mimeType && asset.mimeType.startsWith('image/')) || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(asset.path)
  );
}
