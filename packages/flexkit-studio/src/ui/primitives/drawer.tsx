'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { cn } from '../lib/utils';

type DrawerContextProps = {
  modal: DrawerPrimitive.Root.Props['modal'];
  swipeDirection: NonNullable<DrawerPrimitive.Root.Props['swipeDirection']>;
};

const DrawerContext = React.createContext<DrawerContextProps | null>(null);

function useDrawer(): DrawerContextProps {
  const context = React.useContext(DrawerContext);

  if (!context) {
    throw new Error('useDrawer must be used within a Drawer.');
  }

  return context;
}

/**
 * Base UI drawer. Drawers rendered inside another drawer's React tree are
 * nested: the parent stays mounted and slides aside so a good part of it
 * stays readable behind the frontmost one (see the stack variables on
 * `DrawerContent`).
 */
function Drawer({ modal = true, swipeDirection = 'right', ...props }: DrawerPrimitive.Root.Props) {
  const contextValue = React.useMemo(() => ({ modal, swipeDirection }), [modal, swipeDirection]);

  return (
    <DrawerContext.Provider value={contextValue}>
      <DrawerPrimitive.Root data-slot="drawer" modal={modal} swipeDirection={swipeDirection} {...props} />
    </DrawerContext.Provider>
  );
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        'fk:fixed fk:inset-0 fk:z-50 fk:min-h-dvh fk:bg-overlay/75 fk:backdrop-blur-[1px] fk:select-none',
        'fk:opacity-[max(var(--drawer-overlay-min-opacity,0),calc(1-var(--drawer-swipe-progress)))] fk:transition-opacity fk:duration-450 fk:ease-[cubic-bezier(0.32,0.72,0,1)]',
        'fk:data-starting-style:opacity-0 fk:data-ending-style:pointer-events-none fk:data-ending-style:opacity-0 fk:data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] fk:data-swiping:duration-0',
        'fk:supports-[-webkit-touch-callout:none]:absolute',
        className
      )}
      {...props}
    />
  );
}

function DrawerContent({ className, children, ...props }: DrawerPrimitive.Popup.Props) {
  const { modal, swipeDirection } = useDrawer();
  const swipeAxis = swipeDirection === 'down' || swipeDirection === 'up' ? 'y' : 'x';

  return (
    <DrawerPortal>
      {modal === true ? <DrawerOverlay /> : null}
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        data-modal={modal}
        className="fk:pointer-events-none fk:fixed fk:inset-0 fk:z-50 fk:select-none fk:data-[modal=true]:pointer-events-auto"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          data-swipe-axis={swipeAxis}
          className={cn(
            // Base.
            'fk:group/drawer-popup fk:pointer-events-auto fk:fixed fk:z-50 fk:m-(--drawer-inset,0px) fk:flex fk:h-(--drawer-content-height) fk:max-h-(--drawer-content-max-height,none) fk:min-h-0 fk:w-(--drawer-content-width,auto) fk:transform-[translate3d(var(--translate-x,0px),var(--translate-y,0px),0)_scale(var(--stack-scale))] fk:flex-col fk:bg-background fk:transition-[transform,height,opacity,filter] fk:duration-450 fk:ease-[cubic-bezier(0.22,1,0.36,1)] fk:will-change-transform fk:outline-none fk:select-none fk:[interpolate-size:allow-keywords]',
            // Nested: the parent stays readable, only dimmed a little.
            'fk:data-nested-drawer-open:overflow-hidden fk:data-nested-drawer-open:brightness-90',
            // Bleed: keeps the background continuous while a drawer is swiped past its edge.
            'fk:after:pointer-events-none fk:after:absolute fk:after:bg-(--drawer-bleed-background,var(--background)) fk:data-[swipe-axis=x]:after:inset-y-0 fk:data-[swipe-axis=x]:after:w-(--bleed) fk:data-[swipe-axis=y]:after:inset-x-0 fk:data-[swipe-axis=y]:after:h-(--bleed) fk:data-[swipe-direction=down]:after:top-full fk:data-[swipe-direction=left]:after:right-full fk:data-[swipe-direction=right]:after:left-full fk:data-[swipe-direction=up]:after:bottom-full',
            // Sizing.
            'fk:[--drawer-content-height:var(--drawer-height,auto)] fk:data-[swipe-axis=x]:[--drawer-content-width:clamp(40vw,95vw,60rem)] fk:data-[swipe-axis=y]:[--drawer-content-max-height:calc(100dvh-6rem)]',
            // Stack: each parent slides out from behind its child by `--stack-gap`:
            // `--peek` of its width at most, and no more than the room beside the
            // drawer split across the stack's levels (`--stack-levels`, set by the
            // modal), so the bottom drawer never leaves the viewport. `--stack-step`
            // is how much smaller each level behind gets.
            'fk:[--bleed:3rem] fk:[--peek:40%] fk:[--stack-room:max(0px,calc(100vw-100%))] fk:[--stack-gap:min(var(--peek),calc(var(--stack-room)/max(1,var(--stack-levels,1))))] fk:[--stack-step:0.02] fk:[--stack-height:var(--drawer-frontmost-height,var(--drawer-height,0px))] fk:[--stack-peek-offset:max(0px,calc((var(--nested-drawers)-var(--stack-progress))*var(--stack-gap)))] fk:[--stack-progress:clamp(0,var(--drawer-swipe-progress),1)] fk:[--stack-scale-base:max(0,calc(1-(var(--nested-drawers)*var(--stack-step))))] fk:[--stack-scale:clamp(0,calc(var(--stack-scale-base)+(var(--stack-step)*var(--stack-progress))),1)] fk:[--stack-shrink:calc(1-var(--stack-scale))]',
            // Transitions.
            'fk:data-ending-style:transform-(--closed-transform) fk:data-ending-style:opacity-[0.9999] fk:data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] fk:data-nested-drawer-swiping:duration-0 fk:data-ending-style:data-nested-drawer-swiping:duration-[calc(var(--drawer-swipe-strength)*400ms)] fk:data-starting-style:transform-(--closed-transform) fk:data-swiping:duration-0 fk:data-ending-style:data-swiping:duration-[calc(var(--drawer-swipe-strength)*400ms)]',
            // Axis: y.
            'fk:data-[swipe-axis=y]:inset-x-0 fk:data-[swipe-axis=y]:data-nested-drawer-open:h-(--stack-height)',
            // Axis: x.
            'fk:data-[swipe-axis=x]:inset-y-0',
            // Direction: down.
            'fk:data-[swipe-direction=down]:bottom-0 fk:data-[swipe-direction=down]:origin-bottom fk:data-[swipe-direction=down]:rounded-t-[20px] fk:data-[swipe-direction=down]:border-t fk:data-[swipe-direction=down]:[--closed-transform:translate3d(0,calc(100%+var(--drawer-inset,0px)+2px),0)] fk:data-[swipe-direction=down]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)-var(--stack-peek-offset)-(var(--stack-shrink)*var(--stack-height)))]',
            // Direction: up.
            'fk:data-[swipe-direction=up]:top-0 fk:data-[swipe-direction=up]:origin-top fk:data-[swipe-direction=up]:rounded-b-[20px] fk:data-[swipe-direction=up]:border-b fk:data-[swipe-direction=up]:[--closed-transform:translate3d(0,calc(-100%-var(--drawer-inset,0px)-2px),0)] fk:data-[swipe-direction=up]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)+var(--stack-peek-offset)+(var(--stack-shrink)*var(--stack-height)))]',
            // Direction: left.
            'fk:data-[swipe-direction=left]:left-0 fk:data-[swipe-direction=left]:origin-left fk:data-[swipe-direction=left]:rounded-r-[20px] fk:data-[swipe-direction=left]:border-r fk:data-[swipe-direction=left]:[--closed-transform:translate3d(calc(-100%-var(--drawer-inset,0px)-2px),0,0)] fk:data-[swipe-direction=left]:[--translate-x:calc(var(--drawer-swipe-movement-x)+var(--stack-peek-offset)+(var(--stack-shrink)*100%))]',
            // Direction: right.
            'fk:data-[swipe-direction=right]:right-0 fk:data-[swipe-direction=right]:origin-right fk:data-[swipe-direction=right]:rounded-l-[20px] fk:data-[swipe-direction=right]:border-l fk:data-[swipe-direction=right]:[--closed-transform:translate3d(calc(100%+var(--drawer-inset,0px)+2px),0,0)] fk:data-[swipe-direction=right]:[--translate-x:calc(var(--drawer-swipe-movement-x)-var(--stack-peek-offset)-(var(--stack-shrink)*100%))]',
            'fk:corner-squircle fk:shadow-2xl',
            className
          )}
          {...props}
        >
          <DrawerPrimitive.Content
            data-slot="drawer-content"
            className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col fk:overflow-hidden fk:overscroll-contain fk:rounded-[inherit] fk:select-text fk:group-data-swiping/drawer-popup:select-none"
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'fk:flex fk:shrink-0 fk:gap-2.5 fk:p-4 fk:group-data-[swipe-axis=y]/drawer-popup:text-center fk:md:text-left',
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
      className={cn('fk:mt-auto fk:flex fk:shrink-0 fk:flex-col fk:gap-2 fk:p-4', className)}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('fk:flex fk:items-center fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight', className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
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
