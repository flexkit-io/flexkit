'use client';

import * as React from 'react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'fk:z-50 fk:max-h-(--radix-dropdown-menu-content-available-height) fk:min-w-32 fk:origin-(--radix-dropdown-menu-content-transform-origin) fk:overflow-x-hidden fk:overflow-y-auto fk:rounded-md fk:border fk:bg-popover fk:p-1 fk:text-popover-foreground fk:shadow-md fk:data-[side=bottom]:slide-in-from-top-2 fk:data-[side=left]:slide-in-from-right-2 fk:data-[side=right]:slide-in-from-left-2 fk:data-[side=top]:slide-in-from-bottom-2 fk:data-[state=closed]:animate-out fk:data-[state=closed]:fade-out-0 fk:data-[state=closed]:zoom-out-95 fk:data-[state=open]:animate-in fk:data-[state=open]:fade-in-0 fk:data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "fk:relative fk:flex fk:cursor-default fk:items-center fk:gap-2 fk:rounded-sm fk:px-2 fk:py-1.5 fk:text-sm fk:outline-hidden fk:select-none fk:focus:bg-accent fk:focus:text-accent-foreground fk:data-[disabled]:pointer-events-none fk:data-[disabled]:opacity-50 fk:data-[inset]:pl-8 fk:data-[variant=destructive]:text-destructive fk:data-[variant=destructive]:focus:bg-destructive/10 fk:data-[variant=destructive]:focus:text-destructive fk:dark:data-[variant=destructive]:focus:bg-destructive/20 fk:[&_svg]:pointer-events-none fk:[&_svg]:shrink-0 fk:[&_svg:not([class*='size-'])]:size-4 fk:[&_svg:not([class*='text-'])]:text-muted-foreground fk:data-[variant=destructive]:*:[svg]:text-destructive!",
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "fk:relative fk:flex fk:cursor-default fk:items-center fk:gap-2 fk:rounded-sm fk:py-1.5 fk:pr-2 fk:pl-8 fk:text-sm fk:outline-hidden fk:select-none fk:focus:bg-accent fk:focus:text-accent-foreground fk:data-[disabled]:pointer-events-none fk:data-[disabled]:opacity-50 fk:[&_svg]:pointer-events-none fk:[&_svg]:shrink-0 fk:[&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="fk:pointer-events-none fk:absolute fk:left-2 fk:flex fk:size-3.5 fk:items-center fk:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "fk:relative fk:flex fk:cursor-default fk:items-center fk:gap-2 fk:rounded-sm fk:py-1.5 fk:pr-2 fk:pl-8 fk:text-sm fk:outline-hidden fk:select-none fk:focus:bg-accent fk:focus:text-accent-foreground fk:data-[disabled]:pointer-events-none fk:data-[disabled]:opacity-50 fk:[&_svg]:pointer-events-none fk:[&_svg]:shrink-0 fk:[&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="fk:pointer-events-none fk:absolute fk:left-2 fk:flex fk:size-3.5 fk:items-center fk:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn('fk:px-2 fk:py-1.5 fk:text-sm fk:font-medium fk:data-[inset]:pl-8', className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('fk:-mx-1 fk:my-1 fk:h-px fk:bg-border', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('fk:ml-auto fk:text-xs fk:tracking-widest fk:text-muted-foreground', className)}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "fk:flex fk:cursor-default fk:items-center fk:gap-2 fk:rounded-sm fk:px-2 fk:py-1.5 fk:text-sm fk:outline-hidden fk:select-none fk:focus:bg-accent fk:focus:text-accent-foreground fk:data-[inset]:pl-8 fk:data-[state=open]:bg-accent fk:data-[state=open]:text-accent-foreground fk:[&_svg]:pointer-events-none fk:[&_svg]:shrink-0 fk:[&_svg:not([class*='size-'])]:size-4 fk:[&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="fk:ml-auto fk:size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'fk:z-50 fk:min-w-32 fk:origin-(--radix-dropdown-menu-content-transform-origin) fk:overflow-hidden fk:rounded-md fk:border fk:bg-popover fk:p-1 fk:text-popover-foreground fk:shadow-lg fk:data-[side=bottom]:slide-in-from-top-2 fk:data-[side=left]:slide-in-from-right-2 fk:data-[side=right]:slide-in-from-left-2 fk:data-[side=top]:slide-in-from-bottom-2 fk:data-[state=closed]:animate-out fk:data-[state=closed]:fade-out-0 fk:data-[state=closed]:zoom-out-95 fk:data-[state=open]:animate-in fk:data-[state=open]:fade-in-0 fk:data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
