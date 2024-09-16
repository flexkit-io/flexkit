import {
  Check,
  CheckSquare,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ListOrdered,
  type LucideIcon,
  TextIcon,
  TextQuote,
} from 'lucide-react';
import { EditorBubbleItem, useEditor } from 'novel';
import { Button } from '../../../../ui/primitives/button';
import { PopoverContent, PopoverTrigger } from '../../../../ui/primitives/popover';
import { Popover } from '@radix-ui/react-popover';

export type SelectorItem = {
  name: string;
  icon: LucideIcon;
  command: (editor: ReturnType<typeof useEditor>['editor']) => void;
  isActive: (editor: ReturnType<typeof useEditor>['editor']) => boolean;
};

const items: SelectorItem[] = [
  {
    name: 'Text',
    icon: TextIcon,
    command: (editor) => editor?.chain().focus().clearNodes().run(),
    // I feel like there has to be a more efficient way to do this – feel free to PR if you know how!
    isActive: (editor) =>
      editor != null &&
      editor.isActive('paragraph') &&
      !editor.isActive('bulletList') &&
      !editor.isActive('orderedList'),
  },
  {
    name: 'Heading 1',
    icon: Heading1,
    command: (editor) => editor?.chain().focus().clearNodes().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor != null && editor.isActive('heading', { level: 1 }),
  },
  {
    name: 'Heading 2',
    icon: Heading2,
    command: (editor) => editor?.chain().focus().clearNodes().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor != null && editor.isActive('heading', { level: 2 }),
  },
  {
    name: 'Heading 3',
    icon: Heading3,
    command: (editor) => editor?.chain().focus().clearNodes().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor != null && editor.isActive('heading', { level: 3 }),
  },
  {
    name: 'To-do List',
    icon: CheckSquare,
    command: (editor) => editor?.chain().focus().clearNodes().toggleTaskList().run(),
    isActive: (editor) => editor != null && editor.isActive('taskItem'),
  },
  {
    name: 'Bullet List',
    icon: ListOrdered,
    command: (editor) => editor?.chain().focus().clearNodes().toggleBulletList().run(),
    isActive: (editor) => editor != null && editor.isActive('bulletList'),
  },
  {
    name: 'Numbered List',
    icon: ListOrdered,
    command: (editor) => editor?.chain().focus().clearNodes().toggleOrderedList().run(),
    isActive: (editor) => editor != null && editor.isActive('orderedList'),
  },
  {
    name: 'Quote',
    icon: TextQuote,
    command: (editor) => editor?.chain().focus().clearNodes().toggleBlockquote().run(),
    isActive: (editor) => editor != null && editor.isActive('blockquote'),
  },
  {
    name: 'Code',
    icon: Code,
    command: (editor) => editor?.chain().focus().clearNodes().toggleCodeBlock().run(),
    isActive: (editor) => editor != null && editor.isActive('codeBlock'),
  },
];
interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NodeSelector = ({ open, onOpenChange }: NodeSelectorProps) => {
  const { editor } = useEditor();
  if (!editor) return null;
  const activeItem = items.filter((item) => item.isActive(editor)).pop() ?? {
    name: 'Multiple',
  };

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild className="fk-gap-2 fk-rounded-none fk-border-none hover:fk-bg-muted focus:fk-ring-0">
        <Button size="sm" variant="ghost" className="fk-gap-2">
          <span className="fk-whitespace-nowrap fk-text-sm">{activeItem.name}</span>
          <ChevronDown className="fk-h-4 fk-w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={5} align="start" className="fk-w-48 fk-p-1">
        {items.map((item) => (
          <EditorBubbleItem
            key={item.name}
            onSelect={(editor) => {
              item.command(editor);
              onOpenChange(false);
            }}
            className="fk-flex fk-cursor-pointer fk-items-center fk-justify-between fk-rounded-sm fk-px-2 fk-py-1 fk-text-sm hover:fk-bg-muted"
          >
            <div className="fk-flex fk-items-center fk-space-x-2">
              <div className="fk-rounded-sm fk-border fk-p-1">
                <item.icon className="fk-h-3 fk-w-3" />
              </div>
              <span>{item.name}</span>
            </div>
            {activeItem.name === item.name && <Check className="fk-h-4 fk-w-4" />}
          </EditorBubbleItem>
        ))}
      </PopoverContent>
    </Popover>
  );
};
