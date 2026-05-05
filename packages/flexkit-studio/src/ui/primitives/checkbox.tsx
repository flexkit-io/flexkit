'use client';

import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { CheckIcon } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'fk:peer fk:size-4 fk:shrink-0 fk:rounded-[4px] fk:border fk:border-input fk:shadow-xs fk:transition-shadow fk:outline-none fk:focus-visible:border-ring fk:focus-visible:ring-[3px] fk:focus-visible:ring-ring/50 fk:disabled:cursor-not-allowed fk:disabled:opacity-50 fk:aria-invalid:border-destructive fk:aria-invalid:ring-destructive/20 fk:data-[state=checked]:border-primary fk:data-[state=checked]:bg-primary fk:data-[state=checked]:text-primary-foreground fk:dark:bg-input/30 fk:dark:aria-invalid:ring-destructive/40 fk:dark:data-[state=checked]:bg-primary',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="fk:grid fk:place-content-center fk:text-current fk:transition-none"
      >
        <CheckIcon className="fk:size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
