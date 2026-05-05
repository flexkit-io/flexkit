'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { XIcon } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';
import { Button } from './button';

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fk:fixed fk:inset-0 fk:z-50 fk:bg-black/50 fk:data-[state=closed]:animate-out fk:data-[state=closed]:fade-out-0 fk:data-[state=open]:animate-in fk:data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fk:fixed fk:top-[50%] fk:left-[50%] fk:z-50 fk:grid fk:w-full fk:max-w-[calc(100%-2rem)] fk:translate-x-[-50%] fk:translate-y-[-50%] fk:gap-4 fk:rounded-lg fk:border fk:bg-background fk:p-6 fk:shadow-lg fk:duration-200 fk:outline-none fk:data-[state=closed]:animate-out fk:data-[state=closed]:fade-out-0 fk:data-[state=closed]:zoom-out-95 fk:data-[state=open]:animate-in fk:data-[state=open]:fade-in-0 fk:data-[state=open]:zoom-in-95 fk:sm:max-w-lg',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="fk:absolute fk:top-4 fk:right-4 fk:rounded-xs fk:opacity-70 fk:ring-offset-background fk:transition-opacity fk:hover:opacity-100 fk:focus:ring-2 fk:focus:ring-ring fk:focus:ring-offset-2 fk:focus:outline-hidden fk:disabled:pointer-events-none fk:data-[state=open]:bg-accent fk:data-[state=open]:text-muted-foreground fk:[&_svg]:pointer-events-none fk:[&_svg]:shrink-0 fk:[&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="fk:sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('fk:flex fk:flex-col fk:gap-2 fk:text-center fk:sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('fk:flex fk:flex-col-reverse fk:gap-2 fk:sm:flex-row fk:sm:justify-end', className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('fk:text-lg fk:leading-none fk:font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('fk:text-sm fk:text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
