'use client';

import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';
import { cn } from 'src/ui/lib/utils';

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'fk:flex fk:items-center fk:gap-2 fk:text-sm fk:leading-none fk:font-medium fk:select-none fk:group-data-[disabled=true]:pointer-events-none fk:group-data-[disabled=true]:opacity-50 fk:peer-disabled:cursor-not-allowed fk:peer-disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Label };
