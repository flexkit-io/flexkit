import { Tooltip, TooltipContent, TooltipPortal, TooltipProvider, TooltipTrigger } from '../../ui/primitives/tooltip';
import { IMAGES_BASE_URL } from '../../core/api-paths';

export type Image = {
  _id: string;
  path: string;
};

export function Image({ value }: { value: Image }) {
  if (!value?.path) {
    return null;
  }

  const thumbnaillUrl = value.path.endsWith('.svg')
    ? `${IMAGES_BASE_URL}${value.path}`
    : `${IMAGES_BASE_URL}${value.path}?w=84&h=84&f=webp`;
  const fullUrl = value.path.endsWith('.svg')
    ? `${IMAGES_BASE_URL}${value.path}`
    : `${IMAGES_BASE_URL}${value.path}?w=624&h=624&f=webp`;

  return (
    <div className="fk-z-10">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <img src={thumbnaillUrl} alt="image" className="fk-w-7 fk-h-7 fk-cursor-zoom-in" />
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>
              <img src={fullUrl} alt="image" className="fk-w-52 fk-h-52" />
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
