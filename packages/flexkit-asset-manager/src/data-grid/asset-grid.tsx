'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type JSX,
  type MouseEvent,
  type ReactElement,
  type UIEvent,
} from 'react';
import {
  IMAGES_BASE_URL,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useGraphQLError,
  useReactTable,
} from '@flexkit/studio';
import type {
  AttributeValue,
  ColumnDef,
  ColumnFiltersState,
  ReactTable,
  Row,
  RowSelectionState,
  SortingState,
  Updater,
  VisibilityState,
} from '@flexkit/studio';
import {
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@flexkit/studio/ui';
import { LoaderCircle } from 'lucide-react';
import { FileIcon as FileTypeIcon, defaultStyles } from 'react-file-icon';
import { AssetRowActions } from './asset-row-actions';

// Temporary fix due to runtime mismatch between React 18 and React 19 types
type FileTypeIconCompatProps = {
  extension: string;
  [key: string]: string | number | boolean | undefined;
};

const FileTypeIconCompat = FileTypeIcon as unknown as ComponentType<FileTypeIconCompatProps>;

const transparentImageBackground =
  'fk:bg-[#fafafa] [--asset-checker:#f0f0f0] [background-image:linear-gradient(45deg,var(--asset-checker)_25%,transparent_25%),linear-gradient(-45deg,var(--asset-checker)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--asset-checker)_75%),linear-gradient(-45deg,transparent_75%,var(--asset-checker)_75%)] [background-position:0_0,0_4px,4px_-4px,-4px_0px] [background-size:8px_8px] fk:dark:bg-[#222] dark:[--asset-checker:#2a2a2a]';

type AssetRecord = {
  _id?: string;
  path?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

interface AssetGridProps<TData extends AttributeValue, TValue> {
  columns: ColumnDef<AttributeValue, TValue>[];
  data: TData[];
  entityName: string;
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onSortingChange?: (updater: Updater<SortingState>) => void;
  pageSize?: number;
  sorting?: SortingState;
  toolbarComponent?: (table: ReactTable<AttributeValue>) => ReactElement;
}

function getLoadMoreThreshold(clientHeight: number): number {
  return Math.max(600, clientHeight);
}

function formatAssetSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) {
    return '';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtensionFromPath(path: string): string {
  const [clean] = path.split('?');
  const parts = clean.split('.');

  if (parts.length > 1) {
    return parts.pop()!.toLowerCase();
  }

  return 'file';
}

function isImagePath(path: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(path);
}

export function AssetGrid<TData extends AttributeValue, TValue>({
  columns,
  data,
  entityName,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  onLoadMore,
  onSortingChange,
  pageSize,
  sorting: sortingProp,
  toolbarComponent,
}: AssetGridProps<TData, TValue>): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { schemaErrorMessage } = useGraphQLError();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [uncontrolledSorting, setUncontrolledSorting] = useState<SortingState>([]);
  const sorting = sortingProp ?? uncontrolledSorting;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [entityName]);

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
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id,
    // Filtering is applied via GraphQL `where` from the toolbar; keep loaded
    // pages intact instead of re-filtering them client-side.
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
  });

  const { rows } = table.getRowModel();

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

    onLoadMoreRef.current();
  }, []);

  useEffect(() => {
    checkLoadMore();
  }, [checkLoadMore, rows.length, hasMore, isLoadingMore]);

  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    checkLoadMore(event.currentTarget);
  }

  if (schemaErrorMessage) {
    return <></>;
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:w-full fk:min-w-0 fk:flex-col fk:gap-4">
      {toolbarComponent ? toolbarComponent(table) : null}
      <div className="fk:relative fk:min-h-0 fk:min-w-0 fk:flex-1">
        {isLoadingMore ? (
          <div
            aria-hidden
            className="fk:pointer-events-none fk:absolute fk:top-0 fk:right-px fk:left-px fk:z-20 fk:h-0.5 fk:overflow-hidden fk:opacity-40"
          >
            <div className="fk:animate-progress fk:h-full fk:w-full fk:bg-foreground" />
          </div>
        ) : null}
        <div
          className="fk:h-full fk:overflow-auto fk:pt-px fk:pb-20 fk:-ml-0.5 fk:pr-3"
          onScroll={handleScroll}
          ref={scrollRef}
        >
          {isLoading ? (
            <div className="fk:grid fk:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] fk:gap-3">
              {Array.from({ length: pageSize ?? 50 }, (_, index) => (
                <div className="fk:rounded-md fk:border fk:border-border fk:p-2" key={`skeleton-${index}`}>
                  <Skeleton className="fk:aspect-square fk:w-full fk:rounded-sm" />
                  <Skeleton className="fk:mt-2 fk:h-3 fk:w-[75%]" />
                  <Skeleton className="fk:mt-1.5 fk:h-3 fk:w-[50%]" />
                </div>
              ))}
            </div>
          ) : null}
          {!isLoading && rows.length === 0 ? (
            <div className="fk:flex fk:h-24 fk:items-center fk:justify-center fk:text-sm fk:text-muted-foreground">
              No results.
            </div>
          ) : null}
          {!isLoading && rows.length > 0 ? (
            <div className="fk:grid fk:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] fk:pl-0.5 fk:gap-3">
              {rows.map((row) => (
                <AssetGridCard key={row.id} row={row} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AssetGridCard({ row }: { row: Row<AttributeValue> }): JSX.Element {
  const asset = row.original as AssetRecord;
  const path = asset.path ?? '';
  const filename = asset.originalFilename || path || 'Untitled';
  const mimeType = asset.mimeType ?? '';
  const sizeLabel = formatAssetSize(asset.size);
  const isSelected = row.getIsSelected();
  const metaLine = [mimeType, sizeLabel].filter(Boolean).join(' · ');

  return (
    <div
      className={`fk:relative fk:rounded-md fk:border fk:p-2 fk:transition-colors ${
        isSelected
          ? 'fk:border-primary fk:ring-1 fk:ring-primary/40 fk:bg-muted/40'
          : 'fk:border-border fk:bg-background fk:hover:border-muted-foreground/30'
      }`}
      data-state={isSelected ? 'selected' : undefined}
    >
      <div className="fk:absolute fk:left-3 fk:top-3 fk:z-10 fk:mix-blend-difference">
        <Checkbox
          className="fk:border-white!"
          aria-label={`Select ${filename}`}
          checked={isSelected}
          onCheckedChange={(value) => {
            row.toggleSelected(Boolean(value));
          }}
          onClick={(event) => event.stopPropagation()}
        />
      </div>
      <div className="fk:group fk:absolute fk:right-2 fk:top-2 fk:z-10 fk:mix-blend-difference">
        <AssetRowActions overlay row={row} />
      </div>
      <AssetGridMedia filename={filename} path={path} />
      <div className="fk:mt-2 fk:truncate fk:text-xs fk:font-medium" title={filename}>
        {filename}
      </div>
      {metaLine ? (
        <div className="fk:mt-0.5 fk:truncate fk:text-[11px] fk:text-muted-foreground" title={metaLine}>
          {metaLine}
        </div>
      ) : null}
    </div>
  );
}

function AssetGridMedia({ filename, path }: { filename: string; path: string }): JSX.Element {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isZoomImageLoaded, setIsZoomImageLoaded] = useState(false);

  if (!path) {
    return (
      <div className="fk:flex fk:aspect-square fk:items-center fk:justify-center fk:rounded-sm fk:bg-muted">
        <span className="fk:text-xs fk:text-muted-foreground">No preview</span>
      </div>
    );
  }

  const isImage = isImagePath(path);

  if (!isImage) {
    const ext = getExtensionFromPath(path);
    const style = (
      defaultStyles as unknown as {
        [key: string]: { [key: string]: string | number | boolean | undefined } | undefined;
      }
    )[ext];

    return (
      <div className="fk:flex fk:aspect-square fk:items-center fk:justify-center fk:rounded-sm fk:bg-muted fk:[&>svg]:h-12 fk:[&>svg]:w-auto">
        <FileTypeIconCompat extension={ext} {...(style || {})} />
      </div>
    );
  }

  const thumbnailUrl = path.endsWith('.svg')
    ? `${IMAGES_BASE_URL}${path}`
    : `${IMAGES_BASE_URL}${path}?w=320&h=320&f=webp`;
  const zoomUrl = `${IMAGES_BASE_URL}${path}`;

  function handleThumbnailClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    setIsZoomImageLoaded(false);
    setIsZoomOpen(true);
  }

  function handleZoomOpenChange(open: boolean): void {
    setIsZoomOpen(open);

    if (!open) {
      setIsZoomImageLoaded(false);
    }
  }

  return (
    <>
      <button
        className={`fk:aspect-square fk:w-full fk:cursor-zoom-in fk:overflow-hidden fk:rounded-sm fk:border-0 fk:p-0 ${transparentImageBackground}`}
        onClick={handleThumbnailClick}
        type="button"
      >
        <img alt={filename} className="fk:h-full fk:w-full fk:object-contain" src={thumbnailUrl} />
      </button>
      <Dialog open={isZoomOpen} onOpenChange={handleZoomOpenChange}>
        <DialogContent className="fk:sm:max-w-4xl fk:p-3">
          <DialogHeader>
            <DialogTitle className="fk:sr-only">Asset preview</DialogTitle>
            <DialogDescription className="fk:sr-only">Enlarged asset preview</DialogDescription>
          </DialogHeader>
          <div className="fk:relative fk:flex fk:h-[min(85vh,56rem)] fk:w-full fk:items-center fk:justify-center fk:overflow-hidden fk:rounded-md">
            {!isZoomImageLoaded ? (
              <LoaderCircle
                aria-label="Loading image"
                className="fk:absolute fk:h-8 fk:w-8 fk:animate-spin fk:text-muted-foreground"
              />
            ) : null}
            <img
              alt={filename}
              className={`fk:max-h-full fk:max-w-full fk:object-contain fk:transition-opacity ${
                isZoomImageLoaded ? 'fk:opacity-100' : 'fk:opacity-0'
              }`}
              onError={() => setIsZoomImageLoaded(true)}
              onLoad={() => setIsZoomImageLoaded(true)}
              src={zoomUrl}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
