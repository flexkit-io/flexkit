import {
  BriefcaseBusiness,
  List as ListIcon,
  Maximize2,
  RotateCcw,
  Smile as SmileIcon,
  Sparkles,
  Text as TextIcon,
  WandSparkles,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/primitives/tooltip';
import { Button } from '../ui/primitives/button';
import { Input } from '../ui/primitives/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/primitives/popover';
import { Separator } from '../ui/primitives/separator';
import type { FormAttributeValue } from '../graphql-client/types';

/**
 *
 * @returns TODO: Rwwrite this to use the CMDK component of Shadcn (like Novel.sh)
 */
export default function AiWrittingTools(): JSX.Element {
  type WritingAction =
    | 'proofread'
    | 'rewrite'
    | 'make-formal'
    | 'make-friendly'
    | 'summarize'
    | 'expand'
    | 'bullet-points'
    | 'undo';

  function handleWritingAction({
    action,
    previousValue,
  }: {
    action: WritingAction;
    previousValue: FormAttributeValue | undefined;
  }): void {
    switch (action) {
      case 'proofread':
        setValue(name, {
          ...previousValue,
          value: 'Proofread text',
        });
        break;
      case 'rewrite':
        console.log('Rewriting...');
        break;
      case 'make-formal':
        console.log('Making formal...');
        break;
      case 'make-friendly':
        console.log('Making friendly...');
        break;
      case 'summarize':
        console.log('Summarizing...');
        break;
      case 'expand':
        console.log('Expanding...');
        break;
      case 'bullet-points':
        console.log('Creating bullet points...');
        break;
      case 'undo':
        setValue(name, previousValue);
        break;
      default:
        console.error('Invalid action');
    }
  }

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button className="fk-text-muted-foreground" size="icon" variant="ghost">
                <WandSparkles className="fk-w-4 fk-h-4" />
                <span className="fk-sr-only">Open AI Writing Actions</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open AI Writing Actions</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="fk-w-screen fk-max-w-[22rem] fk-space-y-4" align="end">
          <Input className="fk-w-full" placeholder="Describe your change" />
          <div className="fk-flex fk-gap-4 fk-mt-2">
            <Button
              className="fk-w-full"
              onClick={() => {
                handleWritingAction({ action: 'proofread', text: field.value?.value ?? '' });
              }}
              variant="secondary"
            >
              <Sparkles className="fk-w-4 fk-h-4 fk-mr-2" />
              Proofread
            </Button>
            <Button className="fk-w-full" variant="secondary">
              <RotateCcw className="fk-w-4 fk-h-4 fk-mr-2" />
              Rewrite
            </Button>
          </div>
          <div className="space-y-1">
            <Button className="fk-w-full fk-justify-start" variant="ghost">
              <BriefcaseBusiness className="fk-w-4 fk-h-4 fk-mr-2" />
              Make Formal
            </Button>
            <Button className="fk-w-full fk-justify-start" variant="ghost">
              <SmileIcon className="fk-w-4 fk-h-4 fk-mr-2" />
              Make Friendly
            </Button>
          </div>
          <Separator className="!fk-mt-2" />
          <div className="space-y-1 !fk-mt-2">
            <Button className="fk-w-full fk-justify-start" variant="ghost">
              <TextIcon className="fk-w-4 fk-h-4 fk-mr-2" />
              Summarize
            </Button>
            <Button className="fk-w-full fk-justify-start" variant="ghost">
              <Maximize2 className="fk-w-4 fk-h-4 fk-mr-2" />
              Expand
            </Button>
            <Button className="fk-w-full fk-justify-start" variant="ghost">
              <ListIcon className="fk-w-4 fk-h-4 fk-mr-2" />
              Bullet Points
            </Button>
          </div>
        </PopoverContent>
      </TooltipProvider>
    </Popover>
  );
}
