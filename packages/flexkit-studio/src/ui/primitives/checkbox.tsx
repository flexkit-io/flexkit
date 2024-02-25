'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    className={cn(
      'fk-peer fk-h-4 fk-w-4 fk-shrink-0 fk-rounded-sm fk-border fk-border-primary fk-ring-offset-background focus-visible:fk-outline-none focus-visible:fk-ring-2 focus-visible:fk-ring-ring focus-visible:fk-ring-offset-2 disabled:fk-cursor-not-allowed disabled:fk-opacity-50 data-[state=checked]:fk-bg-primary data-[state=checked]:fk-text-primary-foreground',
      className
    )}
    ref={ref}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn('fk-flex fk-items-center fk-justify-center fk-text-current')}>
      <Check className="fk-h-4 fk-w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
