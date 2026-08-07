import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const alertVariants = cva(
  'fk:relative fk:w-full fk:rounded-lg fk:border fk:px-4 fk:py-3 fk:[&>svg~*]:pl-7 fk:[&>svg+div]:translate-y-[-3px] fk:[&>svg]:absolute fk:[&>svg]:left-4 fk:[&>svg]:top-4 fk:[&>svg]:text-foreground',
  {
    variants: {
      variant: {
        'default': 'fk:bg-card fk:text-card-foreground',
        destructive: 'fk:border-none fk:text-destructive fk:bg-destructive-foreground fk:[&>svg]:text-destructive',
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
    <div data-slot="alert-description" className={cn('fk:text-sm fk:[&_p]:leading-relaxed', className)} {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription };
