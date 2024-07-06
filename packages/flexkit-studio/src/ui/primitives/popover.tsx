'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from 'src/ui/lib/utils';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'fk-z-50 fk-w-72 fk-rounded-md fk-border fk-bg-popover fk-p-4 fk-text-popover-foreground fk-shadow-md fk-outline-none data-[state=open]:fk-animate-in data-[state=closed]:fk-animate-out data-[state=closed]:fk-fade-out-0 data-[state=open]:fk-fade-in-0 data-[state=closed]:fk-zoom-out-95 data-[state=open]:fk-zoom-in-95 data-[side=bottom]:fk-slide-in-from-top-2 data-[side=left]:fk-slide-in-from-right-2 data-[side=right]:fk-slide-in-from-left-2 data-[side=top]:fk-slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
