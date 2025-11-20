'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    className={cn(
      'fk-flex fk-h-10 fk-w-full fk-items-center fk-justify-between fk-rounded-md fk-border fk-border-input fk-bg-background fk-px-3 fk-py-2 fk-text-sm fk-ring-offset-background placeholder:fk-text-muted-foreground focus:fk-outline-none focus:fk-ring-2 focus:fk-ring-ring focus:fk-ring-offset-2 disabled:fk-cursor-not-allowed disabled:fk-opacity-50 [&>span]:fk-line-clamp-1',
      className
    )}
    ref={ref}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="fk-h-4 fk-w-4 fk-opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    className={cn('fk-flex fk-cursor-default fk-items-center fk-justify-center fk-py-1', className)}
    ref={ref}
    {...props}
  >
    <ChevronUp className="fk-h-4 fk-w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    className={cn('fk-flex fk-cursor-default fk-items-center fk-justify-center fk-py-1', className)}
    ref={ref}
    {...props}
  >
    <ChevronDown className="fk-h-4 fk-w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      className={cn(
        'fk-relative fk-z-50 fk-max-h-96 fk-min-w-[8rem] fk-overflow-hidden fk-rounded-md fk-border fk-border-border fk-bg-popover fk-text-popover-foreground fk-shadow-md data-[state=open]:fk-animate-in data-[state=closed]:fk-animate-out data-[state=closed]:fk-fade-out-0 data-[state=open]:fk-fade-in-0 data-[state=closed]:fk-zoom-out-95 data-[state=open]:fk-zoom-in-95 data-[side=bottom]:fk-slide-in-from-top-2 data-[side=left]:fk-slide-in-from-right-2 data-[side=right]:fk-slide-in-from-left-2 data-[side=top]:fk-slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:fk-translate-y-1 data-[side=left]:-fk-translate-x-1 data-[side=right]:fk-translate-x-1 data-[side=top]:-fk-translate-y-1',
        className
      )}
      position={position}
      ref={ref}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'fk-p-1',
          position === 'popper' &&
            'fk-h-[var(--radix-select-trigger-height)] fk-w-full fk-min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    className={cn('fk-py-1.5 fk-pl-8 fk-pr-2 fk-text-sm fk-font-semibold', className)}
    ref={ref}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    className={cn(
      'fk-relative fk-flex fk-w-full fk-cursor-default fk-select-none fk-items-center fk-rounded-sm fk-py-1.5 fk-pl-8 pr-2 fk-text-sm fk-outline-none focus:fk-bg-accent focus:fk-text-accent-foreground data-[disabled]:fk-pointer-events-none data-[disabled]:fk-opacity-50',
      className
    )}
    ref={ref}
    {...props}
  >
    <span className="fk-absolute fk-left-2 fk-flex fk-h-3.5 fk-w-3.5 fk-items-center fk-justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="fk-h-4 fk-w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator className={cn('-fk-mx-1 fk-my-1 fk-h-px fk-bg-muted', className)} ref={ref} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
