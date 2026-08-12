import * as React from 'react';
import { Loader2Icon } from 'lucide-react';
import { cn } from '../lib/utils';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('fk:size-4 fk:animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
