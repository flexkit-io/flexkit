import { Tooltip, TooltipContent, TooltipPortal, TooltipProvider, TooltipTrigger } from '../../ui/primitives/tooltip';
import { IMAGES_BASE_URL } from '../../core/api-paths';
import type { ComponentType } from 'react';
import { FileIcon as FileTypeIcon, defaultStyles } from 'react-file-icon';
import { useCachedImageSrc } from '../../ui/hooks/use-cached-image-src';

// Temporary fix due to runtime mismatch between React 18 and React 19 types
type FileTypeIconCompatProps = {
  extension: string;
  [key: string]: string | number | boolean | undefined;
};

const FileTypeIconCompat = FileTypeIcon as unknown as ComponentType<FileTypeIconCompatProps>;

export type Asset = {
  _id: string;
  path: string;
};

export function Asset({ value }: { value: Asset }) {
  const path = value?.path ?? '';
  const hasPath = Boolean(path);
  const isImage = hasPath && /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(path);

  const getExtensionFromPath = (p: string): string => {
    const clean = p.split('?')[0];
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
    <div className="fk-z-10">
      <TooltipProvider>
        {isImage ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <img
                alt="asset"
                className="fk-w-7 fk-h-7 fk-cursor-zoom-in fk-bg-muted/40 fk-rounded-sm"
                decoding="async"
                src={cachedThumbnailSrc ?? undefined}
              />
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>
                <img
                  alt="asset"
                  className="fk-w-52 fk-h-52 fk-bg-muted/40 fk-rounded-sm"
                  decoding="async"
                  src={fullUrl}
                />
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="fk-w-7 fk-h-7 fk-rounded fk-bg-transparent fk-flex fk-items-center fk-justify-center [&>svg]:fk-h-full [&>svg]:fk-w-auto">
                {(() => {
                  const ext = getExtensionFromPath(path);
                  const style = (
                    defaultStyles as Record<string, Record<string, string | number | boolean | undefined>>
                  )[ext];

                  return <FileTypeIconCompat extension={ext} {...(style || {})} />;
                })()}
              </div>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>
                <div className="fk-text-sm fk-text-muted-foreground">Preview not available</div>
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}
