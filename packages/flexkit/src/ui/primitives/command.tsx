'use client';

import * as React from 'react';
import { type DialogProps } from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';
import { Dialog, DialogContent } from 'src/ui/primitives/dialog';

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    className={cn(
      'fk-flex fk-h-full fk-w-full fk-flex-col fk-overflow-hidden fk-rounded-md fk-bg-popover fk-text-popover-foreground',
      className
    )}
    ref={ref}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

// eslint-disable-next-line @typescript-eslint/no-empty-interface -- from radix-ui
interface CommandDialogProps extends DialogProps {}

function CommandDialog({ children, ...props }: CommandDialogProps): JSX.Element {
  return (
    <Dialog {...props}>
      <DialogContent className="fk-overflow-hidden fk-p-0 fk-shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:fk-px-2 [&_[cmdk-group-heading]]:fk-font-medium [&_[cmdk-group-heading]]:fk-text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:fk-pt-0 [&_[cmdk-group]]:fk-px-2 [&_[cmdk-input-wrapper]_svg]:fk-h-5 [&_[cmdk-input-wrapper]_svg]:fk-w-5 [&_[cmdk-input]]:fk-h-12 [&_[cmdk-item]]:fk-px-2 [&_[cmdk-item]]:fk-py-3 [&_[cmdk-item]_svg]:fk-h-5 [&_[cmdk-item]_svg]:fk-w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  // eslint-disable-next-line react/no-unknown-property -- props are spread on the input
  <div className="fk-flex fk-items-center fk-border-b fk-border-border fk-px-3" cmdk-input-wrapper="">
    <Search className="fk-mr-2 fk-h-4 fk-w-4 fk-shrink-0 fk-opacity-50" />
    <CommandPrimitive.Input
      className={cn(
        'fk-flex fk-h-11 fk-w-full fk-rounded-md fk-bg-transparent fk-py-3 fk-text-sm fk-outline-none placeholder:fk-text-muted-foreground disabled:fk-cursor-not-allowed disabled:fk-opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    className={cn('fk-max-h-[300px] fk-overflow-y-auto fk-overflow-x-hidden', className)}
    ref={ref}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => <CommandPrimitive.Empty className="fk-py-6 fk-text-center fk-text-sm" ref={ref} {...props} />);

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    className={cn(
      'fk-overflow-hidden fk-p-1 fk-text-foreground [&_[cmdk-group-heading]]:fk-px-2 [&_[cmdk-group-heading]]:fk-py-1.5 [&_[cmdk-group-heading]]:fk-text-xs [&_[cmdk-group-heading]]:fk-font-medium [&_[cmdk-group-heading]]:fk-text-muted-foreground',
      className
    )}
    ref={ref}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator className={cn('fk-mx-1 fk-h-px bg-border', className)} ref={ref} {...props} />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    className={cn(
      'fk-relative fk-flex fk-cursor-default fk-select-none fk-items-center fk-rounded-sm fk-px-2 fk-py-1.5 fk-text-sm fk-outline-none aria-selected:fk-bg-accent aria-selected:fk-text-accent-foreground data-[disabled]:fk-pointer-events-none data-[disabled]:fk-opacity-50',
      className
    )}
    ref={ref}
    {...props}
  />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <span className={cn('fk-ml-auto fk-text-xs fk-tracking-widest fk-text-muted-foreground', className)} {...props} />
  );
}
CommandShortcut.displayName = 'CommandShortcut';

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
