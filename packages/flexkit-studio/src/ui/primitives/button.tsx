import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  'fk-inline-flex fk-items-center fk-justify-center fk-whitespace-nowrap fk-rounded-lg fk-text-sm fk-font-medium fk-ring-offset-background fk-transition-colors focus-visible:fk-outline-none focus-visible:fk-ring-2 focus-visible:fk-ring-ring focus-visible:fk-ring-offset-2 disabled:fk-pointer-events-none disabled:fk-opacity-50',
  {
    variants: {
      variant: {
        'default': 'fk-bg-primary fk-text-primary-foreground hover:fk-bg-primary/90',
        destructive: 'fk-bg-destructive fk-text-destructive-foreground hover:fk-bg-destructive/90',
        outline: 'fk-border fk-border-input fk-bg-background hover:fk-bg-accent hover:fk-text-accent-foreground',
        secondary: 'fk-bg-secondary fk-text-secondary-foreground hover:fk-bg-secondary/80',
        ghost: 'hover:fk-bg-accent hover:fk-text-accent-foreground',
        link: 'fk-text-primary fk-underline-offset-4 hover:fk-underline',
      },
      size: {
        'default': 'fk-h-10 fk-px-4 fk-py-2',
        sm: 'fk-h-9 fk-rounded-lg fk-px-3',
        lg: 'fk-h-11 fk-rounded-lg fk-px-8',
        icon: 'fk-h-10 fk-w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
