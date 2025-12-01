'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from 'src/ui/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipPortal = TooltipPrimitive.Portal;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    className={cn(
      'fk-z-50 fk-overflow-hidden fk-rounded-md fk-border fk-border-border fk-bg-popover fk-px-3 fk-py-1.5 fk-text-sm fk-text-popover-foreground fk-shadow-md fk-animate-in fk-fade-in-0 fk-zoom-in-95 data-[state=closed]:fk-animate-out data-[state=closed]:fk-fade-out-0 data-[state=closed]:fk-zoom-out-95 data-[side=bottom]:fk-slide-in-from-top-2 data-[side=left]:fk-slide-in-from-right-2 data-[side=right]:fk-slide-in-from-left-2 data-[side=top]:fk-slide-in-from-bottom-2',
      className
    )}
    ref={ref}
    sideOffset={sideOffset}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipPortal, TooltipProvider, TooltipTrigger, TooltipContent };
