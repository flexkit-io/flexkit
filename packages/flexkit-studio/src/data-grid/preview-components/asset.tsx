import type { JSX } from 'react';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../../ui/primitives/tooltip';
import { IMAGES_BASE_URL } from '../../core/api-paths';
import { FileIcon as FileTypeIcon, defaultStyles } from 'react-file-icon';
import { useCachedImageSrc } from '../../ui/hooks/use-cached-image-src';

export type Asset = {
  _id: string;
  path: string;
  /** Total connected assets; the fetched array is bounded by the query's `first`. */
  totalCount?: number;
};

const transparentImageBackground =
  'fk:bg-[#fafafa] [--asset-checker:#f0f0f0] [background-image:linear-gradient(45deg,var(--asset-checker)_25%,transparent_25%),linear-gradient(-45deg,var(--asset-checker)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--asset-checker)_75%),linear-gradient(-45deg,transparent_75%,var(--asset-checker)_75%)] [background-position:0_0,0_4px,4px_-4px,-4px_0px] [background-size:8px_8px] fk:dark:bg-[#222] dark:[--asset-checker:#2a2a2a]';

export function Asset({ value }: { value: Asset | Asset[] }) {
  if (Array.isArray(value)) {
    return <AssetStack value={value} />;
  }

  return <SingleAsset value={value} />;
}

function SingleAsset({ value }: { value: Asset }) {
  const path = value?.path ?? '';
  const hasPath = Boolean(path);
  const isImage = hasPath && /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(path);

  const getExtensionFromPath = (p: string): string => {
    const [clean] = p.split('?');
    const parts = clean.split('.');

    if (parts.length > 1) {
      return parts.pop()!.toLowerCase();
    }

    return 'file';
  };

  const thumbnaillUrl = hasPath
    ? path.endsWith('.svg')
      ? `${IMAGES_BASE_URL}${path}`
      : `${IMAGES_BASE_URL}${path}?w=84&h=84&f=webp`
    : null;

  const fullUrl = hasPath
    ? path.endsWith('.svg')
      ? `${IMAGES_BASE_URL}${path}`
      : `${IMAGES_BASE_URL}${path}?w=624&h=624&f=webp`
    : '';

  const cachedThumbnailSrc = useCachedImageSrc(thumbnaillUrl);

  if (!hasPath) {
    return null;
  }

  return (
    <div className="fk:z-10">
      {isImage ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <img
              alt="asset"
              className={`fk:w-7 fk:h-7 fk:cursor-zoom-in fk:overflow-hidden fk:rounded-md fk:object-contain ${transparentImageBackground}`}
              decoding="async"
              src={cachedThumbnailSrc ?? undefined}
            />
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>
              <img
                alt="asset"
                className={`fk:w-52 fk:h-52 fk:overflow-hidden fk:rounded-md fk:object-contain ${transparentImageBackground}`}
                decoding="async"
                src={fullUrl}
              />
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fk:w-7 fk:h-7 fk:rounded-sm fk:bg-transparent fk:flex fk:items-center fk:justify-center fk:[&>svg]:h-full fk:[&>svg]:w-auto">
              {(() => {
                const ext = getExtensionFromPath(path);
                const style = (
                  defaultStyles as Record<string, Record<string, string | number | boolean | undefined>>
                )[ext];

                return <FileTypeIcon extension={ext} {...(style || {})} />;
              })()}
            </div>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>
              <div className="fk:text-sm fk:text-muted-foreground">Preview not available</div>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      )}
    </div>
  );
}

function AssetStack({ value }: { value: Asset[] }): JSX.Element | null {
  const assets = value.filter((asset) => Boolean(asset.path)).slice(0, 3);
  // Queries bound connection edges, so the array length undercounts; the
  // aggregate total travels on each item as totalCount.
  const totalCount = Math.max(value[0]?.totalCount ?? 0, value.length);

  // All fetched edges can lack `path` (still-processing uploads, incomplete
  // nodes) while totalCount > 0 — especially likely now that list queries
  // only fetch the first 3 edges. Show a count so the cell is not blank.
  if (assets.length === 0) {
    if (totalCount > 0) {
      return (
        <div className="fk:flex fk:items-center">
          <span className="fk:text-xs fk:text-muted-foreground">
            {totalCount === 1 ? '1 asset' : `${totalCount} assets`}
          </span>
        </div>
      );
    }

    return null;
  }

  const overflowCount = totalCount - assets.length;

  return (
    <div className="fk:flex fk:items-center">
      <div className="fk:flex fk:-space-x-2">
        {assets.map((asset) => (
          <img
            alt="asset"
            className={`fk:h-7 fk:w-7 fk:overflow-hidden fk:rounded-md fk:object-contain ${transparentImageBackground}`}
            decoding="async"
            key={asset._id}
            src={`${IMAGES_BASE_URL}${asset.path}?w=84&h=84&f=webp`}
          />
        ))}
      </div>
      {overflowCount > 0 ? (
        <span className="fk:ml-2 fk:text-xs fk:text-muted-foreground">+{overflowCount}</span>
      ) : null}
    </div>
  );
}
