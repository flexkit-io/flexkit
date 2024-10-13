import { Plus as PlusIcon, Tag as TagIcon } from 'lucide-react';
import { Button, ScrollArea, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@flexkit/studio/ui';

export function Sidebar(): JSX.Element {
  return (
    <div className="fk-flex fk-h-full fk-max-h-screen fk-flex-col fk-gap-2">
      <div className="fk-flex fk-h-12 fk-items-center fk-border-b fk-border-b-border fk-px-4 fk-lg:fk-h-[60px] fk-lg:fk-px-6">
        <TagIcon className="fk-h-4 fk-w-4" />
        <span className="fk-px-4 fk-text-sm fk-font-semibold fk-tracking-tight">Tags</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" className="fk-ml-auto fk-h-8 fk-w-8">
                <PlusIcon className="fk-h-4 fk-w-4" />
                <span className="fk-sr-only">Add tag</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add tag</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <ScrollArea className="fk-h-full">
        <div className="fk-flex fk-flex-col fk-px-4 fk-gap-2">No tags yet</div>
      </ScrollArea>
    </div>
  );
}
