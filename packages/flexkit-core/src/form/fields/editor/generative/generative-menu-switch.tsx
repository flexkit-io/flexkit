import { EditorBubble, useEditor } from 'novel';
import { removeAIHighlight } from 'novel/extensions';
import {} from 'novel/plugins';
import { Fragment, type ReactNode, useEffect } from 'react';
import { Button } from '../../../../ui/primitives/button';
import Magic from '../icons/magic';
import { AISelector } from './ai-selector';

interface GenerativeMenuSwitchProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export default function GenerativeMenuSwitch({
  children,
  open,
  onOpenChange,
}: GenerativeMenuSwitchProps): JSX.Element | null {
  const { editor } = useEditor();

  useEffect(() => {
    if (!editor) return;

    if (!open) removeAIHighlight(editor);
  }, [open]);

  if (!editor) return null;

  return (
    <EditorBubble
      tippyOptions={{
        placement: open ? 'bottom-start' : 'top',
        onHidden: () => {
          onOpenChange(false);
          editor.chain().unsetHighlight().run();
        },
      }}
      className="fk-flex fk-w-fit fk-max-w-[90vw] fk-overflow-hidden fk-rounded-md fk-border fk-border-muted fk-bg-background fk-shadow-xl"
    >
      {open && <AISelector open={open} onOpenChange={onOpenChange} />}
      {!open && (
        <Fragment>
          <Button
            className="fk-gap-1 fk-rounded-none fk-text-pink-600"
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              onOpenChange(true);
            }}
            size="sm"
          >
            <Magic className="fk-h-5 fk-w-5" />
            Ask AI
          </Button>
          {children}
        </Fragment>
      )}
    </EditorBubble>
  );
}
