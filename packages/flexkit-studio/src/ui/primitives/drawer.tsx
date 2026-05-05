'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from 'src/ui/lib/utils';

type DrawerPortalProps = React.PropsWithChildren<{
  container?: HTMLElement | null;
}>;

const DrawerPrimitivePortal = DrawerPrimitive.Portal as React.ComponentType<DrawerPortalProps>;

function Drawer({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: DrawerPortalProps) {
  return <DrawerPrimitivePortal {...props} />;
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        'fk:fixed fk:inset-0 fk:z-50 fk:bg-overlay/75 fk:backdrop-blur-[1px] fk:data-[state=closed]:animate-out fk:data-[state=closed]:fade-out-0 fk:data-[state=open]:animate-in fk:data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
}

function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          'fk:group/drawer-content fk:fixed fk:z-50 fk:flex fk:h-auto fk:flex-col fk:bg-background',
          'fk:data-[vaul-drawer-direction=top]:inset-x-0 fk:data-[vaul-drawer-direction=top]:top-0 fk:data-[vaul-drawer-direction=top]:mb-24 fk:data-[vaul-drawer-direction=top]:max-h-[80vh] fk:data-[vaul-drawer-direction=top]:rounded-b-lg fk:data-[vaul-drawer-direction=top]:border-b',
          'fk:data-[vaul-drawer-direction=bottom]:inset-x-0 fk:data-[vaul-drawer-direction=bottom]:bottom-0 fk:data-[vaul-drawer-direction=bottom]:mt-24 fk:data-[vaul-drawer-direction=bottom]:max-h-[80vh] fk:data-[vaul-drawer-direction=bottom]:rounded-t-lg fk:data-[vaul-drawer-direction=bottom]:border-t',
          'fk:data-[vaul-drawer-direction=right]:inset-y-0 fk:data-[vaul-drawer-direction=right]:right-0 fk:data-[vaul-drawer-direction=right]:w-full fk:data-[vaul-drawer-direction=right]:max-w-[clamp(40vw,95vw,60rem)] fk:data-[vaul-drawer-direction=right]:border-l fk:rounded-l-[20px]',
          'fk:data-[vaul-drawer-direction=left]:inset-y-0 fk:data-[vaul-drawer-direction=left]:left-0 fk:data-[vaul-drawer-direction=left]:w-3/4 fk:data-[vaul-drawer-direction=left]:border-r fk:data-[vaul-drawer-direction=left]:sm:max-w-sm',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'fk:absolute fk:z-10 fk:hidden fk:shrink-0 fk:rounded-full fk:bg-muted',
            'fk:group-data-[vaul-drawer-direction=bottom]/drawer-content:top-4 fk:group-data-[vaul-drawer-direction=bottom]/drawer-content:left-1/2 fk:group-data-[vaul-drawer-direction=bottom]/drawer-content:block fk:group-data-[vaul-drawer-direction=bottom]/drawer-content:h-2 fk:group-data-[vaul-drawer-direction=bottom]/drawer-content:w-[100px] fk:group-data-[vaul-drawer-direction=bottom]/drawer-content:-translate-x-1/2',
            'fk:group-data-[vaul-drawer-direction=top]/drawer-content:bottom-4 fk:group-data-[vaul-drawer-direction=top]/drawer-content:left-1/2 fk:group-data-[vaul-drawer-direction=top]/drawer-content:block fk:group-data-[vaul-drawer-direction=top]/drawer-content:h-2 fk:group-data-[vaul-drawer-direction=top]/drawer-content:w-[100px] fk:group-data-[vaul-drawer-direction=top]/drawer-content:-translate-x-1/2',
            'fk:group-data-[vaul-drawer-direction=right]/drawer-content:left-3 fk:group-data-[vaul-drawer-direction=right]/drawer-content:top-1/2 fk:group-data-[vaul-drawer-direction=right]/drawer-content:block fk:group-data-[vaul-drawer-direction=right]/drawer-content:h-[100px] fk:group-data-[vaul-drawer-direction=right]/drawer-content:w-2 fk:group-data-[vaul-drawer-direction=right]/drawer-content:-translate-y-1/2',
            'fk:group-data-[vaul-drawer-direction=left]/drawer-content:right-4 fk:group-data-[vaul-drawer-direction=left]/drawer-content:top-1/2 fk:group-data-[vaul-drawer-direction=left]/drawer-content:block fk:group-data-[vaul-drawer-direction=left]/drawer-content:h-[100px] fk:group-data-[vaul-drawer-direction=left]/drawer-content:w-2 fk:group-data-[vaul-drawer-direction=left]/drawer-content:-translate-y-1/2'
          )}
        />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'fk:flex fk:gap-2.5 fk:p-4 fk:group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center fk:group-data-[vaul-drawer-direction=top]/drawer-content:text-center fk:md:text-left',
        className
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('fk:mt-auto fk:flex fk:flex-col fk:gap-2 fk:p-4', className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('fk:flex fk:items-center fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight', className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('fk:text-sm fk:text-muted-foreground', className)}
      {...props}
    />
  );
}

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
