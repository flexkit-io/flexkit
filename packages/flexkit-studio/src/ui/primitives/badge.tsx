import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'src/ui/lib/utils';

const badgeVariants = cva(
  'fk-inline-flex fk-items-center fk-rounded-full fk-border fk-border-border fk-px-2.5 fk-py-0.5 fk-text-xs fk-font-semibold fk-transition-colors focus:fk-outline-none focus:fk-ring-2 focus:fk-ring-ring focus:fk-ring-offset-2',
  {
    variants: {
      variant: {
        'default': 'fk-border-transparent fk-bg-primary fk-text-primary-foreground hover:fk-bg-primary/80',
        secondary: 'fk-border-transparent fk-bg-secondary fk-text-secondary-foreground hover:fk-bg-secondary/80',
        destructive:
          'fk-border-transparent fk-bg-destructive fk-text-destructive-foreground hover:fk-bg-destructive/80',
        outline: 'fk-text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
