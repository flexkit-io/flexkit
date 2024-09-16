import { CommandGroup, CommandItem, CommandSeparator } from '../../../../ui/primitives/command';
import { useEditor } from 'novel';
import { Check, TextQuote, TrashIcon } from 'lucide-react';

export default function AICompletionCommands({
  completion,
  onDiscard,
}: {
  completion: string;
  onDiscard: () => void;
}): JSX.Element | null {
  const { editor } = useEditor();

  if (!editor) return null;

  return (
    <>
      <CommandGroup>
        <CommandItem
          className="fk-gap-2 fk-px-4"
          value="replace"
          onSelect={() => {
            const selection = editor.view.state.selection;

            editor
              .chain()
              .focus()
              .insertContentAt(
                {
                  from: selection.from,
                  to: selection.to,
                },
                completion
              )
              .run();
          }}
        >
          <Check className="fk-h-4 fk-w-4 fk-text-muted-foreground" />
          Replace selection
        </CommandItem>
        <CommandItem
          className="fk-gap-2 fk-px-4"
          value="insert"
          onSelect={() => {
            const selection = editor.view.state.selection;
            editor
              .chain()
              .focus()
              .insertContentAt(selection.to + 1, completion)
              .run();
          }}
        >
          <TextQuote className="fk-h-4 fk-w-4 fk-text-muted-foreground" />
          Insert below
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />

      <CommandGroup>
        <CommandItem onSelect={onDiscard} value="thrash" className="fk-gap-2 fk-px-4">
          <TrashIcon className="fk-h-4 fk-w-4 fk-text-muted-foreground" />
          Discard
        </CommandItem>
      </CommandGroup>
    </>
  );
}
