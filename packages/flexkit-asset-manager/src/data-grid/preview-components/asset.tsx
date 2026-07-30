import { useState, type ComponentType, type JSX, type MouseEvent } from 'react';
import { IMAGES_BASE_URL } from '@flexkit/studio';
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

// Temporary fix due to runtime mismatch between React 18 and React 19 types
type FileTypeIconCompatProps = {
  extension: string;
  [key: string]: string | number | boolean | undefined;
};

const FileTypeIconCompat = FileTypeIcon as unknown as ComponentType<FileTypeIconCompatProps>;

const transparentImageBackground =
  'fk:bg-[#fafafa] [--asset-checker:#f0f0f0] [background-image:linear-gradient(45deg,var(--asset-checker)_25%,transparent_25%),linear-gradient(-45deg,var(--asset-checker)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--asset-checker)_75%),linear-gradient(-45deg,transparent_75%,var(--asset-checker)_75%)] [background-position:0_0,0_4px,4px_-4px,-4px_0px] [background-size:8px_8px] fk:dark:bg-[#222] dark:[--asset-checker:#2a2a2a]';

export function Asset({ value }: { value: string }): JSX.Element | null {
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  if (!value) {
    return null;
  }

  const path = value;

  const isImage = /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(path);

  const getExtensionFromPath = (p: string): string => {
    const [clean] = p.split('?');
    const parts = clean.split('.');

    if (parts.length > 1) {
      return parts.pop()!.toLowerCase();
    }

    return 'file';
  };

  const thumbnaillUrl = path.endsWith('.svg')
    ? `${IMAGES_BASE_URL}${path}`
    : `${IMAGES_BASE_URL}${path}?w=84&h=84&f=webp`;

  const fullUrl = path.endsWith('.svg') ? `${IMAGES_BASE_URL}${path}` : `${IMAGES_BASE_URL}${path}?w=624&h=624&f=webp`;
  const zoomUrl = `${IMAGES_BASE_URL}${path}`;

  function handleThumbnailClick(event: MouseEvent<HTMLImageElement>): void {
    event.stopPropagation();
    setIsZoomOpen(true);
  }

  return (
    <div className="fk:z-10">
      <TooltipProvider>
        {isImage ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <img
                  src={thumbnaillUrl}
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
                  src={zoomUrl}
                  alt="asset"
                  className={`fk:max-h-[85vh] fk:w-full fk:overflow-hidden fk:rounded-md fk:object-contain`}
                />
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="fk:w-7 fk:h-7 fk:rounded-sm fk:bg-transparent fk:flex fk:items-center fk:justify-center fk:[&>svg]:h-full fk:[&>svg]:w-auto">
                {(() => {
                  const ext = getExtensionFromPath(path);
                  const style = (
                    defaultStyles as unknown as {
                      [key: string]: { [key: string]: string | number | boolean | undefined } | undefined;
                    }
                  )[ext];

                  return <FileTypeIconCompat extension={ext} {...(style || {})} />;
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
      </TooltipProvider>
    </div>
  );
}
