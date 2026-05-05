'use client';

import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from 'src/ui/lib/utils';

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'fk:peer fk:group/switch fk:inline-flex fk:shrink-0 fk:items-center fk:rounded-full fk:border fk:border-transparent fk:shadow-xs fk:transition-all fk:outline-none fk:focus-visible:border-ring fk:focus-visible:ring-[3px] fk:focus-visible:ring-ring/50 fk:disabled:cursor-not-allowed fk:disabled:opacity-50 fk:data-[size=default]:h-[1.15rem] fk:data-[size=default]:w-8 fk:data-[size=sm]:h-3.5 fk:data-[size=sm]:w-6 fk:data-[state=checked]:bg-primary fk:data-[state=unchecked]:bg-input fk:dark:data-[state=unchecked]:bg-input/80',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'fk:pointer-events-none fk:block fk:rounded-full fk:bg-background fk:ring-0 fk:transition-transform fk:group-data-[size=default]/switch:size-4 fk:group-data-[size=sm]/switch:size-3 fk:data-[state=checked]:translate-x-[calc(100%-2px)] fk:data-[state=unchecked]:translate-x-0 fk:dark:data-[state=checked]:bg-primary-foreground fk:dark:data-[state=unchecked]:bg-foreground'
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
