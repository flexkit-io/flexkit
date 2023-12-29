import { cn } from 'src/ui/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('fk-animate-pulse fk-rounded-md fk-bg-muted', className)} {...props} />;
}

export { Skeleton };
