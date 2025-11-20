import { Check, ChevronDown } from 'lucide-react';
import { EditorBubbleItem, useEditor } from 'novel';
import { Button } from '../../../../ui/primitives/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../ui/primitives/popover';

export interface BubbleColorMenuItem {
  name: string;
  color: string;
}

const TEXT_COLORS: BubbleColorMenuItem[] = [
  {
    name: 'Default',
    color: 'var(--novel-black)',
  },
  {
    name: 'Purple',
    color: '#9333EA',
  },
  {
    name: 'Red',
    color: '#E00000',
  },
  {
    name: 'Yellow',
    color: '#EAB308',
  },
  {
    name: 'Blue',
    color: '#2563EB',
  },
  {
    name: 'Green',
    color: '#008A00',
  },
  {
    name: 'Orange',
    color: '#FFA500',
  },
  {
    name: 'Pink',
    color: '#BA4081',
  },
  {
    name: 'Gray',
    color: '#A8A29E',
  },
];

const HIGHLIGHT_COLORS: BubbleColorMenuItem[] = [
  {
    name: 'Default',
    color: 'var(--novel-highlight-default)',
  },
  {
    name: 'Purple',
    color: 'var(--novel-highlight-purple)',
  },
  {
    name: 'Red',
    color: 'var(--novel-highlight-red)',
  },
  {
    name: 'Yellow',
    color: 'var(--novel-highlight-yellow)',
  },
  {
    name: 'Blue',
    color: 'var(--novel-highlight-blue)',
  },
  {
    name: 'Green',
    color: 'var(--novel-highlight-green)',
  },
  {
    name: 'Orange',
    color: 'var(--novel-highlight-orange)',
  },
  {
    name: 'Pink',
    color: 'var(--novel-highlight-pink)',
  },
  {
    name: 'Gray',
    color: 'var(--novel-highlight-gray)',
  },
];

interface ColorSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ColorSelector = ({ open, onOpenChange }: ColorSelectorProps) => {
  const { editor } = useEditor();

  if (!editor) return null;

  const activeColorItem = TEXT_COLORS.find(({ color }) => editor.isActive('textStyle', { color }));
  const activeHighlightItem = HIGHLIGHT_COLORS.find(({ color }) => editor.isActive('highlight', { color }));

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" className="fk-gap-2 fk-rounded-none" variant="ghost">
          <span
            className="fk-rounded-sm fk-px-1"
            style={{
              color: activeColorItem?.color,
              backgroundColor: activeHighlightItem?.color,
            }}
          >
            A
          </span>
          <ChevronDown className="fk-h-4 fk-w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        sideOffset={5}
        className="fk-my-1 fk-flex fk-max-h-80 fk-w-48 fk-flex-col fk-overflow-hidden fk-overflow-y-auto fk-rounded fk-border fk-p-1 fk-shadow-xl "
        align="start"
      >
        <div className="fk-flex fk-flex-col">
          <div className="fk-my-1 fk-px-2 fk-text-sm fk-font-semibold fk-text-muted-foreground">Color</div>
          {TEXT_COLORS.map(({ name, color }) => (
            <EditorBubbleItem
              key={name}
              onSelect={() => {
                editor.commands.unsetColor();
                name !== 'Default' &&
                  editor
                    .chain()
                    .focus()
                    .setColor(color || '')
                    .run();
                onOpenChange(false);
              }}
              className="fk-flex fk-cursor-pointer fk-items-center fk-justify-between fk-px-2 fk-py-1 fk-text-sm hover:fk-bg-muted"
            >
              <div className="fk-flex fk-items-center fk-gap-2">
                <div className="fk-rounded-sm fk-border fk-px-2 fk-py-px fk-font-medium" style={{ color }}>
                  A
                </div>
                <span>{name}</span>
              </div>
            </EditorBubbleItem>
          ))}
        </div>
        <div>
          <div className="fk-my-1 fk-px-2 fk-text-sm fk-font-semibold fk-text-muted-foreground">Background</div>
          {HIGHLIGHT_COLORS.map(({ name, color }) => (
            <EditorBubbleItem
              key={name}
              onSelect={() => {
                editor.commands.unsetHighlight();
                name !== 'Default' && editor.chain().focus().setHighlight({ color }).run();
                onOpenChange(false);
              }}
              className="fk-flex fk-cursor-pointer fk-items-center fk-justify-between fk-px-2 fk-py-1 fk-text-sm hover:fk-bg-muted"
            >
              <div className="fk-flex fk-items-center fk-gap-2">
                <div
                  className="fk-rounded-sm fk-border fk-px-2 fk-py-px fk-font-medium"
                  style={{ backgroundColor: color }}
                >
                  A
                </div>
                <span>{name}</span>
              </div>
              {editor.isActive('highlight', { color }) && <Check className="fk-h-4 fk-w-4" />}
            </EditorBubbleItem>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
