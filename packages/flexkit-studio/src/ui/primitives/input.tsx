import * as React from 'react';
import { cn } from 'src/ui/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'fk:h-9 fk:w-full fk:min-w-0 fk:rounded-md fk:border fk:border-input fk:bg-background fk:px-3 fk:py-1 fk:text-base fk:shadow-xs fk:transition-[color,box-shadow] fk:outline-none fk:selection:bg-primary fk:selection:text-primary-foreground fk:file:inline-flex fk:file:h-7 fk:file:border-0 fk:file:bg-transparent fk:file:text-sm fk:file:font-medium fk:file:text-foreground fk:placeholder:text-muted-foreground fk:disabled:pointer-events-none fk:disabled:cursor-not-allowed fk:disabled:opacity-50 fk:md:text-sm fk:dark:bg-input/30',
        'fk:focus-visible:border-ring fk:focus-visible:ring-[3px] fk:focus-visible:ring-ring/50',
        'fk:aria-invalid:border-destructive fk:aria-invalid:ring-destructive/20 fk:dark:aria-invalid:ring-destructive/40',
        className
      )}
      {...props}
    />
  );
}

export { Input };
