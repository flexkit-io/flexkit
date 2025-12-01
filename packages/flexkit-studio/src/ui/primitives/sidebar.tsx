'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { VariantProps, cva } from 'class-variance-authority';
import { PanelLeft as PanelLeftIcon, Menu as MenuIcon } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Separator } from './separator';
import { Sheet, SheetContent } from './sheet';
import { Skeleton } from './skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

const SIDEBAR_COOKIE_NAME = 'flexkit:sidebar:state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '2rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

type SidebarContext = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContext | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value;

      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open]
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? 'expanded' : 'collapsed';

  const contextValue = React.useMemo<SidebarContext>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH,
              '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            'fk-group/sidebar-wrapper fk-flex fk-w-full has-[[data-variant=inset]]:fk-bg-sidebar fk-overflow-hidden',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
});
SidebarProvider.displayName = 'SidebarProvider';

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    side?: 'left' | 'right';
    variant?: 'sidebar' | 'floating' | 'inset';
    collapsible?: 'offcanvas' | 'icon' | 'none';
  }
>(({ side = 'left', variant = 'sidebar', collapsible = 'offcanvas', className, children, ...props }, ref) => {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div
        className={cn(
          'fk-flex fk-h-full fk-w-[--sidebar-width] fk-flex-col fk-bg-sidebar fk-text-sidebar-foreground',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-mobile="true"
          className="fk-w-[--sidebar-width] fk-bg-sidebar fk-p-0 fk-text-sidebar-foreground [&>button]:fk-hidden"
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <div className="fk-flex fk-h-full fk-w-full fk-flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      ref={ref}
      className="fk-relative fk-group fk-peer fk-hidden md:fk-block fk-text-sidebar-foreground"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        className={cn(
          'fk-duration-200 fk-relative fk-h-svh fk-w-[--sidebar-width] fk-bg-transparent fk-transition-[width] fk-ease-linear',
          'group-data-[collapsible=offcanvas]:fk-w-0',
          'group-data-[side=right]:fk-rotate-180',
          variant === 'floating' || variant === 'inset'
            ? 'group-data-[collapsible=icon]:fk-w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]'
            : 'group-data-[collapsible=icon]:fk-w-[--sidebar-width-icon]'
        )}
      />
      <div
        className={cn(
          'fk-duration-200 fk-absolute fk-inset-y-0 fk-z-10 fk-hidden fk-h-[calc(100svh-3.5rem)] fk-w-[--sidebar-width] fk-transition-[left,right,width] fk-ease-linear md:fk-flex',
          side === 'left'
            ? 'fk-left-0 group-data-[collapsible=offcanvas]:fk-left-[calc(var(--sidebar-width)*-1)]'
            : 'fk-right-0 group-data-[collapsible=offcanvas]:fk-right-[calc(var(--sidebar-width)*-1)]',
          // Adjust the padding for floating and inset variants.
          variant === 'floating' || variant === 'inset'
            ? 'group-data-[collapsible=icon]:fk-w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)] group-data-[side=left]:fk-border-r group-data-[side=right]:fk-border-l'
            : 'group-data-[collapsible=icon]:fk-w-[--sidebar-width-icon] group-data-[side=left]:fk-border-r group-data-[side=right]:fk-border-l',
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          className="fk-flex fk-h-full fk-w-full fk-flex-col fk-bg-sidebar group-data-[variant=floating]:fk-rounded-lg group-data-[variant=floating]:fk-border group-data-[variant=floating]:fk-border-sidebar-border group-data-[variant=floating]:fk-shadow"
        >
          {children}
        </div>
      </div>
    </div>
  );
});
Sidebar.displayName = 'Sidebar';

const SidebarTrigger = React.forwardRef<React.ElementRef<typeof Button>, React.ComponentProps<typeof Button>>(
  ({ className, onClick, ...props }, ref) => {
    const { isMobile, toggleSidebar } = useSidebar();

    return (
      <Button
        ref={ref}
        data-sidebar="trigger"
        variant="ghost"
        size="icon"
        className={cn('fk-h-7 fk-w-7', className)}
        onClick={(event) => {
          onClick?.(event);
          toggleSidebar();
        }}
        {...props}
      >
        {isMobile ? <MenuIcon /> : <PanelLeftIcon />}
        <span className="fk-sr-only">Toggle Sidebar</span>
      </Button>
    );
  }
);
SidebarTrigger.displayName = 'SidebarTrigger';

const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();

    return (
      <button
        ref={ref}
        data-sidebar="rail"
        aria-label="Toggle Sidebar"
        tabIndex={-1}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
        className={cn(
          'fk-absolute fk-inset-y-0 fk-z-20 fk-hidden fk-w-4 fk--translate-x-1/2 fk-transition-all fk-ease-linear after:fk-absolute after:fk-inset-y-0 after:fk-left-1/2 after:fk-w-[2px] after:fk-bg-sidebar-border hover:after:fk-bg-muted-foreground group-data-[side=left]:fk--right-4 group-data-[side=right]:fk-left-0 sm:fk-flex',
          '[[data-side=left]_&]:fk-cursor-w-resize [[data-side=right]_&]:fk-cursor-e-resize',
          '[[data-side=left][data-state=collapsed]_&]:fk-cursor-e-resize [[data-side=right][data-state=collapsed]_&]:fk-cursor-w-resize',
          'group-data-[collapsible=offcanvas]:fk-translate-x-0 group-data-[collapsible=offcanvas]:after:fk-left-full group-data-[collapsible=offcanvas]:hover:fk-bg-sidebar',
          '[[data-side=left][data-collapsible=offcanvas]_&]:fk--right-2',
          '[[data-side=right][data-collapsible=offcanvas]_&]:fk--left-2',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarRail.displayName = 'SidebarRail';

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<'main'>>(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn(
        'fk-relative fk-flex fk-flex-1 fk-flex-col fk-bg-background fk-overflow-hidden',
        'peer-data-[variant=inset]:fk-h-[calc(100svh-4rem)]',
        className
      )}
      {...props}
    />
  );
});
SidebarInset.displayName = 'SidebarInset';

const SidebarInput = React.forwardRef<React.ElementRef<typeof Input>, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        data-sidebar="input"
        className={cn(
          'fk-h-8 fk-w-full fk-bg-background fk-shadow-none focus-visible:fk-ring-2 focus-visible:fk-ring-sidebar-ring',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarInput.displayName = 'SidebarInput';

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} data-sidebar="header" className={cn('fk-flex fk-flex-col fk-gap-2 fk-p-2', className)} {...props} />
  );
});
SidebarHeader.displayName = 'SidebarHeader';

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} data-sidebar="footer" className={cn('fk-flex fk-flex-col fk-gap-2 fk-p-2', className)} {...props} />
  );
});
SidebarFooter.displayName = 'SidebarFooter';

const SidebarSeparator = React.forwardRef<React.ElementRef<typeof Separator>, React.ComponentProps<typeof Separator>>(
  ({ className, ...props }, ref) => {
    return (
      <Separator
        ref={ref}
        data-sidebar="separator"
        className={cn('fk-mx-2 fk-w-auto fk-bg-sidebar-border', className)}
        {...props}
      />
    );
  }
);
SidebarSeparator.displayName = 'SidebarSeparator';

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        'fk-flex fk-min-h-0 fk-flex-1 fk-flex-col fk-overflow-auto group-data-[collapsible=icon]:fk-overflow-hidden',
        className
      )}
      {...props}
    />
  );
});
SidebarContent.displayName = 'SidebarContent';

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn('fk-relative fk-flex fk-w-full fk-min-w-0 fk-flex-col fk-p-2', className)}
      {...props}
    />
  );
});
SidebarGroup.displayName = 'SidebarGroup';

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'> & { asChild?: boolean }>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';

    return (
      <Comp
        ref={ref}
        data-sidebar="group-label"
        className={cn(
          'fk-duration-200 fk-flex fk-h-8 fk-shrink-0 fk-items-center fk-rounded-md fk-px-2 fk-text-xs fk-font-medium fk-text-sidebar-foreground/70 fk-outline-none fk-ring-sidebar-ring fk-transition-[margin,opa] fk-ease-linear focus-visible:fk-ring-2 [&>svg]:fk-size-4 [&>svg]:fk-shrink-0',
          'group-data-[collapsible=icon]:fk--mt-8 group-data-[collapsible=icon]:fk-opacity-0',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

const SidebarGroupAction = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'> & { asChild?: boolean }>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        data-sidebar="group-action"
        className={cn(
          'fk-absolute fk-right-3 fk-top-3.5 fk-flex fk-aspect-square fk-w-5 fk-items-center fk-justify-center fk-rounded-md fk-p-0 fk-text-sidebar-foreground fk-outline-none fk-ring-sidebar-ring fk-transition-transform hover:fk-bg-sidebar-accent hover:fk-text-sidebar-accent-foreground focus-visible:fk-ring-2 [&>svg]:fk-size-4 [&>svg]:fk-shrink-0',
          // Increases the hit area of the button on mobile.
          'after:fk-absolute after:fk--inset-2 after:md:fk-hidden',
          'group-data-[collapsible=icon]:fk-hidden',
          className
        )}
        {...props}
      />
    );
  }
);
SidebarGroupAction.displayName = 'SidebarGroupAction';

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-sidebar="group-content" className={cn('fk-w-full fk-text-sm', className)} {...props} />
  )
);
SidebarGroupContent.displayName = 'SidebarGroupContent';

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn('fk-flex fk-w-full fk-min-w-0 fk-flex-col fk-gap-1 fk-z-10', className)}
    {...props}
  />
));
SidebarMenu.displayName = 'SidebarMenu';

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(({ className, ...props }, ref) => (
  <li ref={ref} data-sidebar="menu-item" className={cn('fk-group/menu-item fk-relative', className)} {...props} />
));
SidebarMenuItem.displayName = 'SidebarMenuItem';

const sidebarMenuButtonVariants = cva(
  'peer/menu-button fk-flex fk-w-full fk-items-center fk-gap-2 fk-overflow-hidden fk-rounded-md fk-p-2 fk-text-left fk-text-sm fk-outline-none fk-ring-sidebar-ring fk-transition-[width,height,padding] hover:fk-bg-sidebar-accent hover:fk-text-sidebar-accent-foreground focus-visible:fk-ring-2 active:fk-bg-sidebar-accent active:fk-text-sidebar-accent-foreground disabled:fk-pointer-events-none disabled:fk-opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:fk-pr-8 aria-disabled:fk-pointer-events-none aria-disabled:fk-opacity-50 data-[active=true]:fk-bg-sidebar-accent data-[active=true]:fk-font-medium data-[active=true]:fk-text-sidebar-accent-foreground data-[state=open]:hover:fk-bg-sidebar-accent data-[state=open]:hover:fk-text-sidebar-accent-foreground group-data-[collapsible=icon]:fk-!size-8 group-data-[collapsible=icon]:fk-!p-2 [&>span:last-child]:fk-truncate [&>svg]:fk-size-4 [&>svg]:fk-shrink-0',
  {
    variants: {
      variant: {
        default: 'hover:fk-bg-sidebar-accent hover:fk-text-sidebar-accent-foreground',
        outline:
          'fk-bg-background fk-shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:fk-bg-sidebar-accent hover:fk-text-sidebar-accent-foreground hover:fk-shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
      },
      size: {
        default: 'fk-h-8 fk-text-sm',
        sm: 'fk-h-7 fk-text-xs',
        lg: 'fk-h-12 fk-text-sm group-data-[collapsible=icon]:fk-!p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(({ asChild = false, isActive = false, variant = 'default', size = 'default', tooltip, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      ref={ref}
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  if (typeof tooltip === 'string') {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" hidden={state !== 'collapsed' || isMobile} {...tooltip} />
    </Tooltip>
  );
});
SidebarMenuButton.displayName = 'SidebarMenuButton';

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    showOnHover?: boolean;
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        'fk-absolute fk-right-1 fk-top-1.5 fk-flex fk-aspect-square fk-w-5 fk-items-center fk-justify-center fk-rounded-md fk-p-0 fk-text-sidebar-foreground fk-outline-none fk-ring-sidebar-ring fk-transition-transform hover:fk-bg-sidebar-accent hover:fk-text-sidebar-accent-foreground focus-visible:fk-ring-2 peer-hover/menu-button:fk-text-sidebar-accent-foreground [&>svg]:fk-size-4 [&>svg]:fk-shrink-0',
        // Increases the hit area of the button on mobile.
        'after:fk-absolute after:fk--inset-2 after:md:fk-hidden',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:fk-hidden',
        showOnHover &&
          'group-focus-within/menu-item:fk-opacity-100 group-hover/menu-item:fk-opacity-100 data-[state=open]:fk-opacity-100 peer-data-[active=true]/menu-button:fk-text-sidebar-accent-foreground md:fk-opacity-0',
        className
      )}
      {...props}
    />
  );
});
SidebarMenuAction.displayName = 'SidebarMenuAction';

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="menu-badge"
      className={cn(
        'fk-absolute fk-right-1 fk-flex fk-h-5 fk-min-w-5 fk-items-center fk-justify-center fk-rounded-md fk-px-1 fk-text-xs fk-font-medium fk-tabular-nums fk-text-sidebar-foreground fk-select-none fk-pointer-events-none',
        'peer-hover/menu-button:fk-text-sidebar-accent-foreground peer-data-[active=true]/menu-button:fk-text-sidebar-accent-foreground',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:fk-hidden',
        className
      )}
      {...props}
    />
  )
);
SidebarMenuBadge.displayName = 'SidebarMenuBadge';

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    showIcon?: boolean;
  }
>(({ className, showIcon = false, ...props }, ref) => {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn('fk-rounded-md fk-h-8 fk-flex fk-gap-2 fk-px-2 fk-items-center', className)}
      {...props}
    >
      {showIcon && <Skeleton className="fk-size-4 fk-rounded-md" data-sidebar="menu-skeleton-icon" />}
      <Skeleton
        className="fk-h-4 fk-flex-1 fk-max-w-[--skeleton-width]"
        data-sidebar="menu-skeleton-text"
        style={
          {
            '--skeleton-width': width,
          } as React.CSSProperties
        }
      />
    </div>
  );
});
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton';

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      data-sidebar="menu-sub"
      className={cn(
        'fk-mx-3.5 fk-flex fk-min-w-0 fk-translate-x-px fk-flex-col fk-gap-1 fk-border-l fk-border-sidebar-border fk-px-2.5 fk-py-0.5',
        'group-data-[collapsible=icon]:fk-hidden',
        className
      )}
      {...props}
    />
  )
);
SidebarMenuSub.displayName = 'SidebarMenuSub';

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(({ ...props }, ref) => (
  <li ref={ref} {...props} />
));
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem';

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<'a'> & {
    asChild?: boolean;
    size?: 'sm' | 'md';
    isActive?: boolean;
  }
>(({ asChild = false, size = 'md', isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        'fk-flex fk-h-7 fk-min-w-0 fk--translate-x-px fk-items-center fk-gap-2 fk-overflow-hidden fk-rounded-md fk-px-2 fk-text-sidebar-foreground fk-outline-none fk-ring-sidebar-ring hover:fk-bg-sidebar-accent hover:fk-text-sidebar-accent-foreground focus-visible:fk-ring-2 active:fk-bg-sidebar-accent active:fk-text-sidebar-accent-foreground disabled:fk-pointer-events-none disabled:fk-opacity-50 aria-disabled:fk-pointer-events-none aria-disabled:fk-opacity-50 [&>span:last-child]:fk-truncate [&>svg]:fk-size-4 [&>svg]:fk-shrink-0 [&>svg]:fk-text-sidebar-accent-foreground',
        'data-[active=true]:fk-bg-sidebar-accent data-[active=true]:fk-text-sidebar-accent-foreground',
        size === 'sm' && 'fk-text-xs',
        size === 'md' && 'fk-text-sm',
        'group-data-[collapsible=icon]:fk-hidden',
        className
      )}
      {...props}
    />
  );
});
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
