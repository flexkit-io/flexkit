import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'src/ui/lib/utils';

const alertVariants = cva(
  'fk:relative fk:grid fk:w-full fk:grid-cols-[0_1fr] fk:items-start fk:gap-y-0.5 fk:rounded-lg fk:border fk:px-4 fk:py-3 fk:text-sm fk:has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] fk:has-[>svg]:gap-x-3 fk:[&>svg]:size-4 fk:[&>svg]:translate-y-0.5 fk:[&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'fk:bg-card fk:text-card-foreground',
        destructive:
          'fk:bg-card fk:text-destructive fk:*:data-[slot=alert-description]:text-destructive/90 fk:[&>svg]:text-current',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('fk:col-start-2 fk:line-clamp-1 fk:min-h-4 fk:font-medium fk:tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'fk:col-start-2 fk:grid fk:justify-items-start fk:gap-1 fk:text-sm fk:text-muted-foreground fk:[&_p]:leading-relaxed',
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
