'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "fk:flex fk:w-fit fk:items-center fk:justify-between fk:gap-2 fk:rounded-md fk:border fk:border-input fk:bg-background fk:px-3 fk:py-2 fk:text-sm fk:whitespace-nowrap fk:shadow-xs fk:transition-[color,box-shadow] fk:outline-none fk:focus-visible:border-ring fk:focus-visible:ring-[3px] fk:focus-visible:ring-ring/50 fk:disabled:cursor-not-allowed fk:disabled:opacity-50 fk:aria-invalid:border-destructive fk:aria-invalid:ring-destructive/20 fk:data-placeholder:text-muted-foreground fk:data-[size=default]:h-9 fk:data-[size=sm]:h-8 fk:*:data-[slot=select-value]:line-clamp-1 fk:*:data-[slot=select-value]:flex fk:*:data-[slot=select-value]:items-center fk:*:data-[slot=select-value]:gap-2 fk:hover:bg-accent fk:dark:aria-invalid:ring-destructive/40 fk:*[_svg]:pointer-events-none fk:*[_svg]:shrink-0 fk:*[_svg:not([class*='size-'])]:size-4 fk:*[_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="fk:size-4 fk:opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'item-aligned',
  align = 'center',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'fk:relative fk:z-50 fk:max-h-(--radix-select-content-available-height) fk:min-w-[8rem] fk:origin-(--radix-select-content-transform-origin) fk:overflow-x-hidden fk:overflow-y-auto fk:rounded-md fk:border fk:bg-popover fk:text-popover-foreground fk:shadow-md fk:data-[side=bottom]:slide-in-from-top-2 fk:data-[side=left]:slide-in-from-right-2 fk:data-[side=right]:slide-in-from-left-2 fk:data-[side=top]:slide-in-from-bottom-2 fk:data-[state=closed]:animate-out fk:data-[state=closed]:fade-out-0 fk:data-[state=closed]:zoom-out-95 fk:data-[state=open]:animate-in fk:data-[state=open]:fade-in-0 fk:data-[state=open]:zoom-in-95',
          position === 'popper' &&
            'fk:data-[side=bottom]:translate-y-1 fk:data-[side=left]:-translate-x-1 fk:data-[side=right]:translate-x-1 fk:data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'fk:p-1',
            position === 'popper' &&
              'fk:h-(--radix-select-trigger-height) fk:w-full fk:min-w-(--radix-select-trigger-width) fk:scroll-my-1'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('fk:px-2 fk:py-1.5 fk:text-xs fk:text-muted-foreground', className)}
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "fk:relative fk:flex fk:w-full fk:cursor-default fk:items-center fk:gap-2 fk:rounded-sm fk:py-1.5 fk:pr-8 fk:pl-2 fk:text-sm fk:outline-hidden fk:select-none fk:focus:bg-accent fk:focus:text-accent-foreground fk:data-[disabled]:pointer-events-none fk:data-[disabled]:opacity-50 fk:*[_svg]:pointer-events-none fk:*[_svg]:shrink-0 fk:*[_svg:not([class*='size-'])]:size-4 fk:*[_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="fk:absolute fk:right-2 fk:flex fk:size-3.5 fk:items-center fk:justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="fk:size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('fk:pointer-events-none fk:-mx-1 fk:my-1 fk:h-px fk:bg-border', className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn('fk:flex fk:cursor-default fk:items-center fk:justify-center fk:py-1', className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn('fk:flex fk:cursor-default fk:items-center fk:justify-center fk:py-1', className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
