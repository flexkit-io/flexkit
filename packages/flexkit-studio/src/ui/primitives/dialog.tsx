'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fk-fixed fk-inset-0 fk-z-50 fk-bg-background/80 fk-backdrop-blur-sm data-[state=open]:fk-animate-in data-[state=closed]:fk-animate-out data-[state=closed]:fk-fade-out-0 data-[state=open]:fk-fade-in-0',
      className
    )}
    ref={ref}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        'fk-fixed fk-left-[50%] fk-top-[50%] fk-z-50 fk-grid fk-w-full fk-max-w-lg fk-translate-x-[-50%] fk-translate-y-[-50%] fk-gap-4 fk-border fk-border-border fk-bg-background fk-p-6 fk-shadow-lg fk-duration-200 data-[state=open]:fk-animate-in data-[state=closed]:fk-animate-out data-[state=closed]:fk-fade-out-0 data-[state=open]:fk-fade-in-0 data-[state=closed]:fk-zoom-out-95 data-[state=open]:fk-zoom-in-95 data-[state=closed]:fk-slide-out-to-left-1/2 data-[state=closed]:fk-slide-out-to-top-[48%] data-[state=open]:fk-slide-in-from-left-1/2 data-[state=open]:fk-slide-in-from-top-[48%] sm:fk-rounded-lg',
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="fk-absolute fk-right-4 fk-top-4 fk-rounded-sm fk-opacity-70 fk-ring-offset-background fk-transition-opacity hover:fk-opacity-100 focus:fk-outline-none focus:fk-ring-2 focus:fk-ring-ring focus:fk-ring-offset-2 disabled:fk-pointer-events-none data-[state=open]:fk-bg-accent data-[state=open]:fk-text-muted-foreground">
        <X className="fk-h-4 fk-w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={cn('fk-flex fk-flex-col fk-space-y-1.5 fk-text-center sm:fk-text-left', className)} {...props} />
  );
}
DialogHeader.displayName = 'DialogHeader';

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn('fk-flex fk-flex-col-reverse sm:fk-flex-row sm:fk-justify-end sm:fk-space-x-2', className)}
      {...props}
    />
  );
}

DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    className={cn('fk-text-lg fk-font-semibold fk-leading-none fk-tracking-tight', className)}
    ref={ref}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description className={cn('fk-text-sm fk-text-muted-foreground', className)} ref={ref} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
