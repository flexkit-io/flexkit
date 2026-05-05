'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { cn } from 'src/ui/lib/utils';

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'fk:z-50 fk:w-72 fk:origin-(--radix-popover-content-transform-origin) fk:rounded-md fk:border fk:bg-popover fk:p-4 fk:text-popover-foreground fk:shadow-md fk:outline-hidden fk:data-[side=bottom]:slide-in-from-top-2 fk:data-[side=left]:slide-in-from-right-2 fk:data-[side=right]:slide-in-from-left-2 fk:data-[side=top]:slide-in-from-bottom-2 fk:data-[state=closed]:animate-out fk:data-[state=closed]:fade-out-0 fk:data-[state=closed]:zoom-out-95 fk:data-[state=open]:animate-in fk:data-[state=open]:fade-in-0 fk:data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="popover-header" className={cn('fk:flex fk:flex-col fk:gap-1 fk:text-sm', className)} {...props} />
  );
}

function PopoverTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <div data-slot="popover-title" className={cn('fk:font-medium', className)} {...props} />;
}

function PopoverDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="popover-description" className={cn('fk:text-muted-foreground', className)} {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverHeader, PopoverTitle, PopoverDescription };
