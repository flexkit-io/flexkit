'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    className={cn(
      'fk-flex fk-cursor-default fk-select-none fk-items-center fk-rounded-sm fk-px-2 fk-py-1.5 fk-text-sm fk-outline-none focus:fk-bg-accent data-[state=open]:fk-bg-accent',
      inset && 'fk-pl-8',
      className
    )}
    ref={ref}
    {...props}
  >
    {children}
    <ChevronRight className="fk-ml-auto fk-h-4 fk-w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    className={cn(
      'fk-z-50 fk-min-w-[8rem] fk-overflow-hidden fk-rounded-md fk-border fk-border-border fk-bg-popover fk-p-1 fk-text-popover-foreground fk-shadow-lg data-[state=open]:fk-animate-in data-[state=closed]:fk-animate-out data-[state=closed]:fk-fade-out-0 data-[state=open]:fk-fade-in-0 data-[state=closed]:fk-zoom-out-95 data-[state=open]:fk-zoom-in-95 data-[side=bottom]:fk-slide-in-from-top-2 data-[side=left]:fk-slide-in-from-right-2 data-[side=right]:fk-slide-in-from-left-2 data-[side=top]:fk-slide-in-from-bottom-2',
      className
    )}
    ref={ref}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      className={cn(
        'fk-z-50 fk-min-w-[8rem] fk-overflow-hidden fk-rounded-md fk-border fk-border-border fk-bg-popover fk-p-1 fk-text-popover-foreground fk-shadow-md data-[state=open]:fk-animate-in data-[state=closed]:fk-animate-out data-[state=closed]:fk-fade-out-0 data-[state=open]:fk-fade-in-0 data-[state=closed]:fk-zoom-out-95 data-[state=open]:fk-zoom-in-95 data-[side=bottom]:fk-slide-in-from-top-2 data-[side=left]:fk-slide-in-from-right-2 data-[side=right]:fk-slide-in-from-left-2 data-[side=top]:fk-slide-in-from-bottom-2',
        className
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      'fk-relative fk-flex fk-cursor-default fk-select-none fk-items-center fk-rounded-sm fk-px-2 fk-py-1.5 fk-text-sm fk-outline-none fk-transition-colors focus:fk-bg-accent focus:fk-text-accent-foreground data-[disabled]:fk-pointer-events-none data-[disabled]:fk-opacity-50',
      inset && 'pl-8',
      className
    )}
    ref={ref}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    checked={checked}
    className={cn(
      'fk-relative fk-flex fk-cursor-default fk-select-none fk-items-center fk-rounded-sm fk-py-1.5 fk-pl-8 fk-pr-2 fk-text-sm fk-outline-none fk-transition-colors focus:fk-bg-accent focus:fk-text-accent-foreground data-[disabled]:fk-pointer-events-none data-[disabled]:fk-opacity-50',
      className
    )}
    ref={ref}
    {...props}
  >
    <span className="fk-absolute fk-left-2 fk-flex fk-h-3.5 fk-w-3.5 fk-items-center fk-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    className={cn(
      'fk-relative fk-flex fk-cursor-default fk-select-none fk-items-center fk-rounded-sm fk-py-1.5 fk-pl-8 fk-pr-2 fk-text-sm fk-outline-none fk-transition-colors focus:fk-bg-accent focus:fk-text-accent-foreground data-[disabled]:fk-pointer-events-none data-[disabled]:fk-opacity-50',
      className
    )}
    ref={ref}
    {...props}
  >
    <span className="fk-absolute fk-left-2 fk-flex fk-h-3.5 fk-w-3.5 fk-items-center fk-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    className={cn('fk-px-2 fk-py-1.5 fk-text-sm fk-font-semibold', inset && 'pl-8', className)}
    ref={ref}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    className={cn('-fk--mx-1 fk-my-1 fk-h-px fk-bg-muted', className)}
    ref={ref}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return <span className={cn('fk-ml-auto fk-text-xs fk-tracking-widest fk-opacity-60', className)} {...props} />;
}
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
