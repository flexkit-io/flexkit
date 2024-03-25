'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from 'src/ui/lib/utils';

function Drawer({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>): JSX.Element {
  return <DrawerPrimitive.Root direction="right" shouldScaleBackground={shouldScaleBackground} {...props} />;
}

Drawer.displayName = 'Drawer';

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    className={cn('fk-fixed fk-inset-0 fk-z-50 fk-bg-overlay/80', className)}
    ref={ref}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      className={cn(
        'fk-fixed fk-w-full fk-max-w-[clamp(40vw,95vw,60rem)] fk-right-0 fk-bottom-0 fk-z-50 fk-flex fk-h-full fk-flex-col !fk-transition-all fk-duration-500 fk-ease-[cubic-bezier(0.32,0.72,0,1)] fk-rounded-l-[10px] fk-border fk-border-border fk-bg-background',
        className
      )}
      ref={ref}
      {...props}
    >
      <div className="fk-flex fk-w-full fk-h-full fk-pr-4">
        <div className="fk-my-auto fk-ml-2 fk-h-[100px] fk-w-2 fk-rounded-full fk-bg-muted" />
        <div className="fk-flex fk-flex-col fk-w-full fk-pb-12">{children}</div>
      </div>
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = 'DrawerContent';

function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('fk-flex fk-gap-1.5 fk-p-4 fk-text-center sm:fk-text-left', className)} {...props} />;
}

DrawerHeader.displayName = 'DrawerHeader';

function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('fk-mt-auto fk-flex fk-flex-col fk-gap-2 fk-p-4', className)} {...props} />;
}

DrawerFooter.displayName = 'DrawerFooter';

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    className={cn('fk-flex fk-items-center fk-text-lg fk-font-semibold fk-leading-none fk-tracking-tight', className)}
    ref={ref}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description className={cn('fk-text-sm fk-text-muted-foreground', className)} ref={ref} {...props} />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
