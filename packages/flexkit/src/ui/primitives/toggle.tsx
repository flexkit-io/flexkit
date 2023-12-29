'use client';

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const toggleVariants = cva(
  'fk-inline-flex fk-items-center fk-justify-center fk-rounded-md fk-text-sm fk-font-medium fk-ring-offset-background fk-transition-colors hover:fk-bg-muted hover:fk-text-muted-foreground focus-visible:fk-outline-none focus-visible:fk-ring-2 focus-visible:fk-ring-ring focus-visible:fk-ring-offset-2 disabled:fk-pointer-events-none disabled:fk-opacity-50 data-[state=on]:fk-bg-accent data-[state=on]:fk-text-accent-foreground',
  {
    variants: {
      variant: {
        'default': 'fk-bg-transparent',
        outline: 'fk-border fk-border-input fk-bg-transparent hover:fk-bg-accent hover:fk-text-accent-foreground',
      },
      size: {
        'default': 'fk-h-10 fk-px-3',
        sm: 'fk-h-9 fk-px-2.5',
        lg: 'fk-h-11 fk-px-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root className={cn(toggleVariants({ variant, size, className }))} ref={ref} {...props} />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
