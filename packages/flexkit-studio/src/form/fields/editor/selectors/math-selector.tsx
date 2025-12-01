import { Button } from '../../../../ui/primitives/button';
import { cn } from '../../../../ui/lib/utils';
import { SigmaIcon } from 'lucide-react';
import { useEditor } from 'novel';

export const MathSelector = () => {
  const { editor } = useEditor();

  if (!editor) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="fk-rounded-none fk-w-12"
      onClick={(evt) => {
        if (editor.isActive('math')) {
          editor.chain().focus().unsetLatex().run();
        } else {
          const { from, to } = editor.state.selection;
          const latex = editor.state.doc.textBetween(from, to);

          if (!latex) return;

          editor.chain().focus().setLatex({ latex }).run();
        }
      }}
    >
      <SigmaIcon className={cn('fk-size-4', { 'fk-text-blue-500': editor.isActive('math') })} strokeWidth={2.3} />
    </Button>
  );
};
