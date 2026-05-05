import { cn } from 'src/ui/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="skeleton" className={cn('fk:animate-pulse fk:rounded-md fk:bg-accent', className)} {...props} />
  );
}

export { Skeleton };
