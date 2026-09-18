import { useState, type ComponentType, type JSX, type MouseEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from '@flexkit/studio/ui';
import { FileIcon as FileTypeIcon, defaultStyles } from 'react-file-icon';
import { getAssetImageUrl, getExtensionFromAsset, isImageAsset, type AssetUrlFields } from '../asset-url';

// Temporary fix due to runtime mismatch between React 18 and React 19 types
type FileTypeIconCompatProps = {
  extension: string;
  [key: string]: string | number | boolean | undefined;
};

const FileTypeIconCompat = FileTypeIcon as unknown as ComponentType<FileTypeIconCompatProps>;

const transparentImageBackground =
  'fk:bg-[#fafafa] [--asset-checker:#f0f0f0] [background-image:linear-gradient(45deg,var(--asset-checker)_25%,transparent_25%),linear-gradient(-45deg,var(--asset-checker)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--asset-checker)_75%),linear-gradient(-45deg,transparent_75%,var(--asset-checker)_75%)] [background-position:0_0,0_4px,4px_-4px,-4px_0px] [background-size:8px_8px] fk:dark:bg-[#222] dark:[--asset-checker:#2a2a2a]';

export function Asset({ value }: { value: AssetUrlFields }): JSX.Element | null {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const url = value?.url ?? '';

  if (!value || (!url && !value.path && !value.originalFilename)) {
    return null;
  }

  const isImage = isImageAsset(value) && Boolean(url);

  if (!isImage) {
    const ext = getExtensionFromAsset(value);
    const style = (
      defaultStyles as unknown as {
        [key: string]: { [key: string]: string | number | boolean | undefined } | undefined;
      }
    )[ext];

    return (
      <div className="fk:z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="fk:w-7 fk:h-7 fk:rounded-sm fk:bg-transparent fk:flex fk:items-center fk:justify-center fk:[&>svg]:h-full fk:[&>svg]:w-auto">
                <FileTypeIconCompat extension={ext} {...(style || {})} />
              </div>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>
                <div className="fk:text-sm fk:text-muted-foreground">Preview not available</div>
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  const thumbnailUrl = getAssetImageUrl(url, { width: 84, height: 84 });
  const fullUrl = getAssetImageUrl(url, { width: 624, height: 624 });

  function handleThumbnailClick(event: MouseEvent<HTMLImageElement>): void {
    event.stopPropagation();
    setIsZoomOpen(true);
  }

  return (
    <div className="fk:z-10">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <img
              src={thumbnailUrl}
              alt="asset"
              className={`fk:w-12 fk:h-12 fk:cursor-zoom-in fk:overflow-hidden fk:rounded-md fk:object-contain ${transparentImageBackground}`}
              onClick={handleThumbnailClick}
            />
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>
              <img
                src={fullUrl}
                alt="asset"
                className={`fk:w-52 fk:h-52 fk:overflow-hidden fk:rounded-md fk:object-contain ${transparentImageBackground}`}
              />
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
        <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
          <DialogContent className="fk:sm:max-w-4xl fk:p-3">
            <DialogHeader>
              <DialogTitle className="fk:sr-only">Asset preview</DialogTitle>
              <DialogDescription className="fk:sr-only">Enlarged asset preview</DialogDescription>
            </DialogHeader>
            <img
              src={url}
              alt="asset"
              className={`fk:max-h-[85vh] fk:w-full fk:overflow-hidden fk:rounded-md fk:object-contain`}
            />
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
}
