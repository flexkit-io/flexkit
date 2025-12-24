import { ArrowDownWideNarrow, CheckCheck, RefreshCcwDot, StepForward, WrapText } from 'lucide-react';
import { getPrevText, useEditor } from 'novel';
import { CommandGroup, CommandItem, CommandSeparator } from '../../../../ui/primitives/command';

const options = [
  {
    value: 'improve',
    label: 'Improve writing',
    icon: RefreshCcwDot,
  },

  {
    value: 'fix',
    label: 'Fix grammar',
    icon: CheckCheck,
  },
  {
    value: 'shorter',
    label: 'Make shorter',
    icon: ArrowDownWideNarrow,
  },
  {
    value: 'longer',
    label: 'Make longer',
    icon: WrapText,
  },
];

interface AISelectorCommandsProps {
  onSelect: (value: string, option: string) => void;
}

export default function AISelectorCommands({ onSelect }: AISelectorCommandsProps): JSX.Element | null {
  const { editor } = useEditor();

  if (!editor) return null;

  return (
    <>
      <CommandGroup heading="Edit or review selection">
        {options.map((option) => (
          <CommandItem
            onSelect={(value) => {
              const slice = editor.state.selection.content();
              const text = editor.storage.markdown.serializer.serialize(slice.content);
              onSelect(text, value);
            }}
            className="fk-flex fk-gap-2 fk-px-4"
            key={option.value}
            value={option.value}
          >
            <option.icon className="fk-h-4 fk-w-4 fk-text-foreground" />
            {option.label}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Use AI to do more">
        <CommandItem
          onSelect={() => {
            const pos = editor.state.selection.from;

            const text = getPrevText(editor, pos);
            onSelect(text, 'continue');
          }}
          value="continue"
          className="fk-gap-2 fk-px-4"
        >
          <StepForward className="fk-h-4 fk-w-4 fk-text-foreground" />
          Continue writing
        </CommandItem>
      </CommandGroup>
    </>
  );
}
