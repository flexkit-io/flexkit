import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  "fk:inline-flex fk:shrink-0 fk:items-center fk:justify-center fk:gap-1 fk:rounded-md fk:text-sm fk:font-medium fk:whitespace-nowrap fk:transition-all fk:outline-none fk:focus-visible:border-ring fk:focus-visible:ring-[3px] fk:focus-visible:ring-ring/50 fk:disabled:pointer-events-none fk:disabled:opacity-50 fk:aria-invalid:border-destructive fk:aria-invalid:ring-destructive/20 fk:dark:aria-invalid:ring-destructive/40 fk:[&_svg]:pointer-events-none fk:[&_svg]:shrink-0 fk:[&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'fk:bg-primary fk:text-primary-foreground fk:hover:bg-primary/90',
        destructive:
          'fk:bg-destructive fk:text-white fk:hover:bg-destructive/90 fk:focus-visible:ring-destructive/20 fk:dark:bg-destructive/60 fk:dark:focus-visible:ring-destructive/40',
        outline:
          'fk:border fk:bg-background fk:shadow-xs fk:hover:bg-accent fk:hover:text-accent-foreground fk:dark:border-input',
        secondary: 'fk:bg-secondary fk:text-secondary-foreground fk:hover:bg-secondary/80',
        ghost: 'fk:hover:bg-accent fk:hover:text-accent-foreground fk:dark:hover:bg-accent/50',
        link: 'fk:text-primary fk:underline-offset-4 fk:hover:underline',
      },
      size: {
        default: 'fk:h-9 fk:px-4 fk:py-2 fk:has-[>svg]:px-3',
        xs: "fk:h-6 fk:rounded-md fk:px-2 fk:text-xs fk:has-[>svg]:px-1.5 fk:[&_svg:not([class*='size-'])]:size-3",
        sm: 'fk:h-8 fk:rounded-md fk:px-3 fk:has-[>svg]:px-2.5',
        lg: 'fk:h-10 fk:rounded-md fk:px-6 fk:has-[>svg]:px-4',
        icon: 'fk:size-9',
        'icon-xs': "fk:size-6 fk:rounded-md fk:[&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'fk:size-8',
        'icon-lg': 'fk:size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
