import * as React from 'react';
import { cn } from 'src/ui/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'fk:flex fk:field-sizing-content fk:min-h-16 fk:w-full fk:rounded-md fk:border fk:border-input fk:bg-background fk:px-3 fk:py-2 fk:text-base fk:shadow-xs fk:transition-[color,box-shadow] fk:outline-none fk:placeholder:text-muted-foreground fk:focus-visible:border-ring fk:focus-visible:ring-[3px] fk:focus-visible:ring-ring/50 fk:disabled:cursor-not-allowed fk:disabled:opacity-50 fk:aria-invalid:border-destructive fk:aria-invalid:ring-destructive/20 fk:md:text-sm fk:dark:bg-input/30 fk:dark:aria-invalid:ring-destructive/40',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
