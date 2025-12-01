import { Button } from '../../../../ui/primitives/button';
import { cn } from '../../../../ui/lib/utils';
import { BoldIcon, CodeIcon, ItalicIcon, StrikethroughIcon, UnderlineIcon } from 'lucide-react';
import { EditorBubbleItem, useEditor } from 'novel';
import type { SelectorItem } from './node-selector';

export const TextButtons = () => {
  const { editor } = useEditor();

  if (!editor) return null;

  const items: SelectorItem[] = [
    {
      name: 'bold',
      isActive: (editor) => editor != null && editor.isActive('bold'),
      command: (editor) => editor?.chain().focus().toggleBold().run(),
      icon: BoldIcon,
    },
    {
      name: 'italic',
      isActive: (editor) => editor != null && editor.isActive('italic'),
      command: (editor) => editor?.chain().focus().toggleItalic().run(),
      icon: ItalicIcon,
    },
    {
      name: 'underline',
      isActive: (editor) => editor != null && editor.isActive('underline'),
      command: (editor) => editor?.chain().focus().toggleUnderline().run(),
      icon: UnderlineIcon,
    },
    {
      name: 'strike',
      isActive: (editor) => editor != null && editor.isActive('strike'),
      command: (editor) => editor?.chain().focus().toggleStrike().run(),
      icon: StrikethroughIcon,
    },
    {
      name: 'code',
      isActive: (editor) => editor != null && editor.isActive('code'),
      command: (editor) => editor?.chain().focus().toggleCode().run(),
      icon: CodeIcon,
    },
  ];

  return (
    <div className="fk-flex">
      {items.map((item) => (
        <EditorBubbleItem
          key={item.name}
          onSelect={(editor) => {
            item.command(editor);
          }}
        >
          <Button size="sm" className="fk-rounded-none" onClick={(e) => e.preventDefault()} variant="ghost">
            <item.icon
              className={cn('fk-h-4 fk-w-4', {
                'fk-text-blue-500': item.isActive(editor),
              })}
            />
          </Button>
        </EditorBubbleItem>
      ))}
    </div>
  );
};
