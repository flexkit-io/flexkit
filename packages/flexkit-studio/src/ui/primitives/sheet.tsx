'use client';

import * as React from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { XIcon } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fk:fixed fk:inset-0 fk:z-50 fk:bg-black/50 fk:data-[state=closed]:animate-out fk:data-[state=closed]:fade-out-0 fk:data-[state=open]:animate-in fk:data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left';
  showCloseButton?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'fk:fixed fk:z-50 fk:flex fk:flex-col fk:gap-4 fk:bg-background fk:shadow-lg fk:transition fk:ease-in-out fk:data-[state=closed]:animate-out fk:data-[state=closed]:duration-300 fk:data-[state=open]:animate-in fk:data-[state=open]:duration-500',
          side === 'right' &&
            'fk:inset-y-0 fk:right-0 fk:h-full fk:w-3/4 fk:border-l fk:data-[state=closed]:slide-out-to-right fk:data-[state=open]:slide-in-from-right fk:sm:max-w-sm',
          side === 'left' &&
            'fk:inset-y-0 fk:left-0 fk:h-full fk:w-3/4 fk:border-r fk:data-[state=closed]:slide-out-to-left fk:data-[state=open]:slide-in-from-left fk:sm:max-w-sm',
          side === 'top' &&
            'fk:inset-x-0 fk:top-0 fk:h-auto fk:border-b fk:data-[state=closed]:slide-out-to-top fk:data-[state=open]:slide-in-from-top',
          side === 'bottom' &&
            'fk:inset-x-0 fk:bottom-0 fk:h-auto fk:border-t fk:data-[state=closed]:slide-out-to-bottom fk:data-[state=open]:slide-in-from-bottom',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="fk:absolute fk:top-4 fk:right-4 fk:rounded-xs fk:opacity-70 fk:ring-offset-background fk:transition-opacity fk:hover:opacity-100 fk:focus:ring-2 fk:focus:ring-ring fk:focus:ring-offset-2 fk:focus:outline-hidden fk:disabled:pointer-events-none fk:data-[state=open]:bg-secondary">
            <XIcon className="fk:size-4" />
            <span className="fk:sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('fk:flex fk:flex-col fk:gap-1.5 fk:p-4', className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('fk:mt-auto fk:flex fk:flex-col fk:gap-2 fk:p-4', className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('fk:font-semibold fk:text-foreground', className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('fk:text-sm fk:text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetPortal,
  SheetOverlay,
};
