'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { SearchIcon } from 'lucide-react';
import { cn } from 'src/ui/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from 'src/ui/primitives/dialog';

type CommandChildren = React.ComponentProps<typeof CommandPrimitive>['children'];

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'fk:flex fk:h-full fk:w-full fk:flex-col fk:rounded-md fk:bg-popover fk:text-popover-foreground',
        className
      )}
      {...props}
    />
  );
}

function CommandDialog({
  title = 'Command Palette',
  description = 'Search for a command to run...',
  children,
  className,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="fk:sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent className={cn('fk:overflow-hidden fk:p-0', className)} showCloseButton={showCloseButton}>
        <Command className="fk:**:data-[slot=command-input-wrapper]:h-12 fk:**:[[cmdk-group-heading]]:px-2 fk:**:[[cmdk-group-heading]]:font-medium fk:**:[[cmdk-group-heading]]:text-muted-foreground fk:**:[[cmdk-group]]:px-2 fk:[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 fk:[&_[cmdk-input-wrapper]_svg]:h-5 fk:[&_[cmdk-input-wrapper]_svg]:w-5 fk:**:[[cmdk-input]]:h-12 fk:**:[[cmdk-item]]:px-2 fk:**:[[cmdk-item]]:py-3 fk:[&_[cmdk-item]_svg]:h-5 fk:[&_[cmdk-item]_svg]:w-5">
          {children as CommandChildren}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="fk:flex fk:h-9 fk:items-center fk:gap-2 fk:border-b fk:px-3">
      <SearchIcon className="fk:size-4 fk:shrink-0 fk:opacity-50" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'fk:flex fk:h-10 fk:w-full fk:rounded-md fk:bg-transparent fk:py-3 fk:text-sm fk:outline-hidden fk:placeholder:text-muted-foreground fk:disabled:cursor-not-allowed fk:disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('fk:max-h-[300px] fk:scroll-py-1 fk:overflow-x-hidden fk:overflow-y-auto', className)}
      {...props}
    />
  );
}

function CommandEmpty({ ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty data-slot="command-empty" className="fk:py-6 fk:text-center fk:text-sm" {...props} />;
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'fk:overflow-hidden fk:p-1 fk:text-foreground fk:**:[[cmdk-group-heading]]:px-2 fk:**:[[cmdk-group-heading]]:py-1.5 fk:**:[[cmdk-group-heading]]:text-xs fk:**:[[cmdk-group-heading]]:font-medium fk:**:[[cmdk-group-heading]]:text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('fk:-mx-1 fk:h-px fk:bg-border', className)}
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "fk:relative fk:flex fk:cursor-default fk:items-center fk:gap-2 fk:rounded-sm fk:px-2 fk:py-1.5 fk:text-sm fk:outline-hidden fk:select-none fk:data-[disabled=true]:pointer-events-none fk:data-[disabled=true]:opacity-50 fk:data-[selected=true]:bg-accent fk:data-[selected=true]:text-accent-foreground fk:[&_svg]:pointer-events-none fk:[&_svg]:shrink-0 fk:[&_svg:not([class*='size-'])]:size-4 fk:[&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('fk:ml-auto fk:text-xs fk:tracking-widest fk:text-muted-foreground', className)}
      {...props}
    />
  );
}

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
