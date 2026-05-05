'use client';

import * as React from 'react';
import { Slot } from 'radix-ui';
import { VariantProps, cva } from 'class-variance-authority';
import { PanelLeftIcon } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Separator } from './separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './sheet';
import { Skeleton } from './skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

const SIDEBAR_COOKIE_NAME = 'flexkit:sidebar:state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '2rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

type SidebarContextProps = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
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

  const contextValue = React.useMemo<SidebarContextProps>(
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
          data-slot="sidebar-wrapper"
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH,
              '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            'fk:group/sidebar-wrapper fk:flex fk:w-full fk:has-data-[variant=inset]:bg-sidebar fk:overflow-hidden',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          'fk:flex fk:h-full fk:w-(--sidebar-width) fk:flex-col fk:bg-sidebar fk:text-sidebar-foreground',
          className
        )}
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
          data-slot="sidebar"
          data-mobile="true"
          className="fk:w-(--sidebar-width) fk:bg-sidebar fk:p-0 fk:text-sidebar-foreground fk:[&>button]:hidden"
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="fk:sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="fk:flex fk:h-full fk:w-full fk:flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="fk:group fk:peer fk:hidden fk:text-sidebar-foreground fk:md:block"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          'fk:relative fk:w-(--sidebar-width) fk:bg-transparent fk:transition-[width] fk:duration-200 fk:ease-linear',
          'fk:group-data-[collapsible=offcanvas]:w-0',
          'fk:group-data-[side=right]:rotate-180',
          variant === 'floating' || variant === 'inset'
            ? 'fk:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
            : 'fk:group-data-[collapsible=icon]:w-(--sidebar-width-icon)'
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          'fk:relative fk:inset-y-0 fk:z-10 fk:hidden fk:h-[calc(100svh-3.5rem)] fk:w-(--sidebar-width) fk:transition-[left,right,width] fk:duration-200 fk:ease-linear fk:md:flex',
          side === 'left'
            ? 'fk:left-0 fk:group-data-[collapsible=offcanvas]:-left-(--sidebar-width)'
            : 'fk:right-0 k:group-data-[collapsible=offcanvas]:-right-(--sidebar-width)',
          // Adjust the padding for floating and inset variants.
          variant === 'floating' || variant === 'inset'
            ? 'fk:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)] fk:group-data-[side=left]:border-r'
            : 'fk:group-data-[collapsible=icon]:w-(--sidebar-width-icon) fk:group-data-[side=left]:border-r fk:group-data-[side=right]:border-l',
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="fk:flex fk:h-full fk:w-full fk:flex-col fk:bg-sidebar fk:group-data-[variant=floating]:rounded-lg fk:group-data-[variant=floating]:border fk:group-data-[variant=floating]:border-sidebar-border fk:group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn('fk:size-7', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="fk:sr-only">Toggle Sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        'fk:absolute fk:inset-y-0 fk:z-20 fk:hidden fk:w-4 fk:-translate-x-1/2 fk:transition-all fk:ease-linear fk:group-data-[side=left]:-right-4 fk:group-data-[side=right]:left-0 fk:after:absolute fk:after:inset-y-0 fk:after:left-1/2 fk:after:w-[2px] fk:hover:after:bg-sidebar-border fk:sm:flex',
        'fk:in-data-[side=left]:cursor-w-resize fk:in-data-[side=right]:cursor-e-resize',
        'fk:[[data-side=left][data-state=collapsed]_&]:cursor-e-resize fk:[[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
        'fk:group-data-[collapsible=offcanvas]:translate-x-0 fk:group-data-[collapsible=offcanvas]:after:left-full fk:hover:group-data-[collapsible=offcanvas]:bg-sidebar',
        'fk:[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
        'fk:[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
        className
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        'fk:relative fk:flex fk:flex-1 fk:flex-col fk:bg-background fk:overflow-hidden fk:peer-data-[variant=inset]:h-[calc(100svh-3.625rem)]',
        className
      )}
      {...props}
    />
  );
}

function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn('fk:h-8 fk:w-full fk:bg-background fk:shadow-none', className)}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn('fk:flex fk:flex-col fk:gap-2 fk:p-2', className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn('fk:flex fk:flex-col fk:gap-2 fk:p-2', className)}
      {...props}
    />
  );
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn('fk:mx-2 fk:w-auto fk:bg-sidebar-border', className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        'fk:flex fk:min-h-0 fk:flex-1 fk:flex-col fk:overflow-auto fk:group-data-[collapsible=icon]:overflow-hidden',
        className
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn('fk:relative fk:flex fk:w-full fk:min-w-0 fk:flex-col fk:p-2', className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div';

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        'fk:flex fk:h-8 fk:shrink-0 fk:items-center fk:rounded-md fk:px-2 fk:text-xs fk:font-medium fk:text-sidebar-foreground/70 fk:ring-sidebar-ring fk:outline-hidden fk:transition-[margin,opacity] fk:duration-200 fk:ease-linear fk:focus-visible:ring-2 fk:[&>svg]:size-4 fk:[&>svg]:shrink-0',
        'fk:group-data-[collapsible=icon]:-mt-8 fk:group-data-[collapsible=icon]:opacity-0',
        className
      )}
      {...props}
    />
  );
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        'fk:absolute fk:top-3.5 fk:right-3 fk:flex fk:aspect-square fk:w-5 fk:items-center fk:justify-center fk:rounded-md fk:p-0 fk:text-sidebar-foreground fk:ring-sidebar-ring fk:outline-hidden fk:transition-transform fk:hover:bg-sidebar-accent fk:hover:text-sidebar-accent-foreground fk:focus-visible:ring-2 fk:[&>svg]:size-4 fk:[&>svg]:shrink-0',
        // Increases the hit area of the button on mobile.
        'fk:after:absolute fk:after:-inset-2 fk:md:after:hidden',
        'fk:group-data-[collapsible=icon]:hidden',
        className
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn('fk:w-full fk:text-sm', className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('fk:flex fk:w-full fk:min-w-0 fk:flex-col fk:gap-1', className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn('fk:group/menu-item fk:relative', className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  'fk:peer/menu-button fk:flex fk:w-full fk:items-center fk:gap-2 fk:overflow-hidden fk:rounded-md fk:p-2 fk:text-left fk:text-sm fk:ring-sidebar-ring fk:outline-hidden fk:transition-[width,height,padding] fk:group-has-data-[sidebar=menu-action]/menu-item:pr-8 fk:group-data-[collapsible=icon]:size-8! fk:group-data-[collapsible=icon]:p-2! fk:hover:bg-sidebar-accent fk:hover:text-sidebar-accent-foreground fk:focus-visible:ring-2 fk:active:bg-sidebar-accent fk:active:text-sidebar-accent-foreground fk:disabled:pointer-events-none fk:disabled:opacity-50 fk:aria-disabled:pointer-events-none fk:aria-disabled:opacity-50 fk:data-[active=true]:bg-sidebar-accent fk:data-[active=true]:font-medium fk:data-[active=true]:text-sidebar-accent-foreground fk:data-[state=open]:hover:bg-sidebar-accent fk:data-[state=open]:hover:text-sidebar-accent-foreground fk:[&>span:last-child]:truncate fk:[&>svg]:size-4 fk:[&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'fk:hover:bg-sidebar-accent fk:hover:text-sidebar-accent-foreground',
        outline:
          'fk:bg-background fk:shadow-[0_0_0_1px_hsl(var(--sidebar-border))] fk:hover:bg-sidebar-accent fk:hover:text-sidebar-accent-foreground fk:hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
      },
      size: {
        default: 'fk:h-8 fk:text-sm',
        sm: 'fk:h-7 fk:text-xs',
        lg: 'fk:h-12 fk:text-sm fk:group-data-[collapsible=icon]:p-0!',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot.Root : 'button';
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
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
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  showOnHover?: boolean;
}) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        'fk:absolute fk:top-1.5 fk:right-1 fk:flex fk:aspect-square fk:w-5 fk:items-center fk:justify-center fk:rounded-md fk:p-0 fk:text-sidebar-foreground fk:ring-sidebar-ring fk:outline-hidden fk:transition-transform fk:peer-hover/menu-button:text-sidebar-accent-foreground fk:hover:bg-sidebar-accent fk:hover:text-sidebar-accent-foreground fk:focus-visible:ring-2 fk:[&>svg]:size-4 fk:[&>svg]:shrink-0',
        // Increases the hit area of the button on mobile.
        'fk:after:absolute fk:after:-inset-2 fk:md:after:hidden',
        'fk:peer-data-[size=sm]/menu-button:top-1',
        'fk:peer-data-[size=default]/menu-button:top-1.5',
        'fk:peer-data-[size=lg]/menu-button:top-2.5',
        'fk:group-data-[collapsible=icon]:hidden',
        showOnHover &&
          'fk:group-focus-within/menu-item:opacity-100 fk:group-hover/menu-item:opacity-100 fk:peer-data-[active=true]/menu-button:text-sidebar-accent-foreground fk:data-[state=open]:opacity-100 fk:md:opacity-0',
        className
      )}
      {...props}
    />
  );
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        'fk:pointer-events-none fk:absolute fk:right-1 fk:flex fk:h-5 fk:min-w-5 fk:items-center fk:justify-center fk:rounded-md fk:px-1 fk:text-xs fk:font-medium fk:text-sidebar-foreground fk:tabular-nums fk:select-none',
        'fk:peer-hover/menu-button:text-sidebar-accent-foreground fk:peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
        'fk:peer-data-[size=sm]/menu-button:top-1',
        'fk:peer-data-[size=default]/menu-button:top-1.5',
        'fk:peer-data-[size=lg]/menu-button:top-2.5',
        'fk:group-data-[collapsible=icon]:hidden',
        className
      )}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<'div'> & {
  showIcon?: boolean;
}) {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn('fk:flex fk:h-8 fk:items-center fk:gap-2 fk:rounded-md fk:px-2', className)}
      {...props}
    >
      {showIcon && <Skeleton className="fk:size-4 fk:rounded-md" data-sidebar="menu-skeleton-icon" />}
      <Skeleton
        className="fk:h-4 fk:max-w-(--skeleton-width) fk:flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            '--skeleton-width': width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        'fk:mx-3.5 fk:flex fk:min-w-0 fk:translate-x-px fk:flex-col fk:gap-1 fk:border-l fk:border-sidebar-border fk:px-2.5 fk:py-0.5',
        'fk:group-data-[collapsible=icon]:hidden',
        className
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn('fk:group/menu-sub-item fk:relative', className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  asChild = false,
  size = 'md',
  isActive = false,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
  size?: 'sm' | 'md';
  isActive?: boolean;
}) {
  const Comp = asChild ? Slot.Root : 'a';

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        'fk:flex fk:h-7 fk:min-w-0 fk:-translate-x-px fk:items-center fk:gap-2 fk:overflow-hidden fk:rounded-md fk:px-2 fk:text-sidebar-foreground fk:ring-sidebar-ring fk:outline-hidden fk:hover:bg-sidebar-accent fk:hover:text-sidebar-accent-foreground fk:focus-visible:ring-2 fk:active:bg-sidebar-accent fk:active:text-sidebar-accent-foreground fk:disabled:pointer-events-none fk:disabled:opacity-50 fk:aria-disabled:pointer-events-none fk:aria-disabled:opacity-50 fk:[&>span:last-child]:truncate fk:[&>svg]:size-4 fk:[&>svg]:shrink-0 fk:[&>svg]:text-sidebar-accent-foreground',
        'fk:data-[active=true]:bg-sidebar-accent fk:data-[active=true]:text-sidebar-accent-foreground',
        size === 'sm' && 'fk:text-xs',
        size === 'md' && 'fk:text-sm',
        'fk:group-data-[collapsible=icon]:hidden',
        className
      )}
      {...props}
    />
  );
}

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
