import { Button } from '../../../../ui/primitives/button';
import { PopoverContent } from '../../../../ui/primitives/popover';
import { cn } from '../../../../ui/lib/utils';
import { Popover, PopoverTrigger } from '@radix-ui/react-popover';
import { Check, Trash } from 'lucide-react';
import { useEditor } from 'novel';
import { useEffect, useRef } from 'react';

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (_e) {
    return false;
  }
}

export function getUrlFromString(str: string) {
  if (isValidUrl(str)) return str;
  try {
    if (str.includes('.') && !str.includes(' ')) {
      return new URL(`https://${str}`).toString();
    }
  } catch (_e) {
    return null;
  }
}

interface LinkSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LinkSelector = ({ open, onOpenChange }: LinkSelectorProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { editor } = useEditor();

  // Autofocus on input by default
  useEffect(() => {
    inputRef.current?.focus();
  });

  if (!editor) return null;

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="fk-gap-2 fk-rounded-none fk-border-none">
          <p className="fk-text-base">↗</p>
          <p
            className={cn('fk-underline fk-decoration-stone-400 fk-underline-offset-4', {
              'fk-text-blue-500': editor.isActive('link'),
            })}
          >
            Link
          </p>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="fk-w-60 fk-p-0" sideOffset={10}>
        <form
          onSubmit={(e) => {
            const target = e.currentTarget as HTMLFormElement;
            e.preventDefault();
            const input = target[0] as HTMLInputElement;
            const url = getUrlFromString(input.value);
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
              onOpenChange(false);
            }
          }}
          className="fk-flex fk-p-1"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Paste a link"
            className="fk-flex-1 fk-bg-background fk-p-1 fk-text-sm fk-outline-none"
            defaultValue={editor.getAttributes('link').href || ''}
          />
          {editor.getAttributes('link').href ? (
            <Button
              size="icon"
              variant="outline"
              type="button"
              className="fk-flex fk-h-8 fk-items-center fk-rounded-sm fk-p-1 fk-text-red-600 fk-transition-all hover:fk-bg-red-100 dark:hover:fk-bg-red-800"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                if (inputRef.current) inputRef.current.value = '';
                onOpenChange(false);
              }}
            >
              <Trash className="fk-h-4 fk-w-4" />
            </Button>
          ) : (
            <Button size="icon" className="fk-h-8">
              <Check className="fk-h-4 fk-w-4" />
            </Button>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
};
