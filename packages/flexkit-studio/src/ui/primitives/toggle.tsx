'use client';

import * as React from 'react';
import { Toggle as TogglePrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const toggleVariants = cva(
  "fk:inline-flex fk:items-center fk:justify-center fk:gap-2 fk:rounded-md fk:text-sm fk:font-medium fk:whitespace-nowrap fk:transition-[color,box-shadow] fk:outline-none fk:hover:bg-muted fk:hover:text-muted-foreground fk:focus-visible:border-ring fk:focus-visible:ring-[3px] fk:focus-visible:ring-ring/50 fk:disabled:pointer-events-none fk:disabled:opacity-50 fk:aria-invalid:border-destructive fk:aria-invalid:ring-destructive/20 fk:data-[state=on]:bg-accent fk:data-[state=on]:text-accent-foreground fk:dark:aria-invalid:ring-destructive/40 fk:[&_svg]:pointer-events-none fk:[&_svg]:shrink-0 fk:[&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'fk:bg-transparent',
        outline:
          'fk:border fk:border-input fk:bg-transparent fk:shadow-xs fk:hover:bg-accent fk:hover:text-accent-foreground',
      },
      size: {
        default: 'fk:h-9 fk:min-w-9 fk:px-2',
        sm: 'fk:h-8 fk:min-w-8 fk:px-1.5',
        lg: 'fk:h-10 fk:min-w-10 fk:px-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />
  );
}

export { Toggle, toggleVariants };
