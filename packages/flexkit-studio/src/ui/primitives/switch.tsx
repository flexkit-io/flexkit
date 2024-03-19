'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from 'src/ui/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'fk-peer fk-inline-flex fk-h-6 fk-w-11 fk-shrink-0 fk-cursor-pointer fk-items-center fk-rounded-full fk-border-2 fk-border-transparent fk-transition-colors focus-visible:fk-outline-none focus-visible:fk-ring-2 focus-visible:fk-ring-ring focus-visible:fk-ring-offset-2 focus-visible:fk-ring-offset-background disabled:fk-cursor-not-allowed disabled:fk-opacity-50 data-[state=checked]:fk-bg-primary data-[state=unchecked]:fk-bg-input',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'fk-pointer-events-none fk-block fk-h-5 fk-w-5 fk-rounded-full fk-bg-background fk-shadow-lg fk-ring-0 fk-transition-transform data-[state=checked]:fk-translate-x-5 data-[state=unchecked]:fk-translate-x-0'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
