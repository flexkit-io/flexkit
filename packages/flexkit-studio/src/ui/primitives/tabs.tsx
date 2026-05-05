'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'src/ui/lib/utils';

function Tabs({ className, orientation = 'horizontal', ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn('fk:group/tabs fk:flex fk:data-[orientation=horizontal]:flex-col', className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'fk:group/tabs-list fk:inline-flex fk:w-fit fk:items-center fk:justify-center fk:rounded-lg fk:p-[3px] fk:text-muted-foreground fk:group-data-[orientation=horizontal]/tabs:h-9 fk:group-data-[orientation=vertical]/tabs:h-fit fk:group-data-[orientation=vertical]/tabs:flex-col fk:data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        default: 'fk:bg-muted',
        line: 'fk:gap-1 fk:bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "fk:relative fk:inline-flex fk:h-[calc(100%-1px)] fk:flex-1 fk:items-center fk:justify-center fk:gap-1.5 fk:rounded-md fk:border fk:border-transparent! fk:px-2 fk:py-1 fk:text-sm fk:font-medium fk:whitespace-nowrap fk:text-foreground/60 fk:transition-all fk:group-data-[orientation=vertical]/tabs:w-full fk:group-data-[orientation=vertical]/tabs:justify-start fk:hover:text-foreground fk:focus-visible:border-ring! fk:focus-visible:ring-[3px] fk:focus-visible:ring-ring/50 fk:focus-visible:outline-1 fk:focus-visible:outline-ring fk:disabled:pointer-events-none fk:disabled:opacity-50 fk:group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm fk:group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none fk:dark:text-muted-foreground fk:dark:hover:text-foreground fk:[&_svg]:pointer-events-none fk:[&_svg]:shrink-0 fk:[&_svg:not([class*='size-'])]:size-4",
        'fk:group-data-[variant=line]/tabs-list:bg-transparent fk:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent fk:dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent! fk:dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent',
        'fk:data-[state=active]:bg-background fk:data-[state=active]:text-foreground fk:dark:data-[state=active]:border-muted-foreground/75! fk:dark:data-[state=active]:bg-input/30 fk:dark:data-[state=active]:text-foreground',
        'fk:after:absolute fk:after:bg-foreground fk:after:opacity-0 fk:after:transition-opacity fk:group-data-[orientation=horizontal]/tabs:after:inset-x-0 fk:group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] fk:group-data-[orientation=horizontal]/tabs:after:h-0.5 fk:group-data-[orientation=vertical]/tabs:after:inset-y-0 fk:group-data-[orientation=vertical]/tabs:after:-right-1 fk:group-data-[orientation=vertical]/tabs:after:w-0.5 fk:group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100',
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content data-slot="tabs-content" className={cn('fk:flex-1 fk:outline-none', className)} {...props} />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
