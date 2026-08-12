'use client';

import * as React from 'react';
import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import { cn } from '../lib/utils';

function HoverCard({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

function HoverCardContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'fk:z-50 fk:w-64 fk:origin-(--radix-hover-card-content-transform-origin) fk:rounded-md fk:border fk:bg-popover fk:p-4 fk:text-popover-foreground fk:shadow-md fk:outline-hidden fk:data-[side=bottom]:slide-in-from-top-2 fk:data-[side=left]:slide-in-from-right-2 fk:data-[side=right]:slide-in-from-left-2 fk:data-[side=top]:slide-in-from-bottom-2 fk:data-[state=closed]:animate-out fk:data-[state=closed]:fade-out-0 fk:data-[state=closed]:zoom-out-95 fk:data-[state=open]:animate-in fk:data-[state=open]:fade-in-0 fk:data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
