'use client';

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      'fk-fixed fk-inset-0 fk-z-50 fk-bg-overlay/75 fk-backdrop-blur-[1px] data-[state=open]:fk-animate-in data-[state=closed]:fk-animate-out data-[state=closed]:fk-fade-out-0 data-[state=open]:fk-fade-in-0',
      className
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  'fk-fixed fk-z-50 fk-gap-4 fk-bg-background fk-p-6 fk-shadow-lg fk-transition fk-ease-in-out data-[state=open]:fk-animate-in data-[state=closed]:fk-animate-out data-[state=closed]:fk-duration-300 data-[state=open]:fk-duration-500',
  {
    variants: {
      side: {
        top: 'fk-inset-x-0 fk-top-0 fk-border-b data-[state=closed]:fk-slide-out-to-top data-[state=open]:fk-slide-in-from-top',
        bottom:
          'fk-inset-x-0 fk-bottom-0 fk-border-t data-[state=closed]:fk-slide-out-to-bottom data-[state=open]:fk-slide-in-from-bottom',
        left: 'fk-inset-y-0 fk-left-0 fk-h-full fk-w-3/4 fk-border-r fk-border-r-sidebar-border data-[state=closed]:fk-slide-out-to-left data-[state=open]:fk-slide-in-from-left sm:fk-max-w-sm',
        right:
          'fk-inset-y-0 fk-right-0 fk-h-full fk-w-3/4 fk- fk-border-l data-[state=closed]:fk-slide-out-to-right data-[state=open]:fk-slide-in-from-right sm:fk-max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = 'right', className, children, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content className={cn(sheetVariants({ side }), className)} ref={ref} {...props}>
        {children}
        <SheetPrimitive.Close className="fk-absolute fk-right-4 fk-top-4 fk-rounded-sm fk-opacity-70 fk-ring-offset-background fk-transition-opacity hover:fk-opacity-100 focus:fk-outline-none focus:fk-ring-2 focus:fk-ring-ring focus:fk-ring-offset-2 disabled:fk-pointer-events-none data-[state=open]:fk-bg-secondary">
          <X className="fk-h-4 fk-w-4" />
          <span className="fk-sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={cn('fk-flex fk-flex-col fk-space-y-2 fk-text-center sm:fk-text-left', className)} {...props} />
  );
}
SheetHeader.displayName = 'SheetHeader';

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn('fk-flex fk-flex-col-reverse sm:fk-flex-row sm:fk-justify-end sm:fk-space-x-2', className)}
      {...props}
    />
  );
}
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    className={cn('fk-text-lg fk-font-semibold fk-text-foreground', className)}
    ref={ref}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description className={cn('fk-text-sm fk-text-muted-foreground', className)} ref={ref} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
