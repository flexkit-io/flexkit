import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'src/ui/lib/utils';

const badgeVariants = cva(
  'fk:inline-flex fk:w-fit fk:shrink-0 fk:items-center fk:justify-center fk:gap-1 fk:overflow-hidden fk:rounded-full fk:border fk:border-transparent fk:px-2 fk:py-0.5 fk:text-xs fk:font-medium fk:whitespace-nowrap fk:transition-[color,box-shadow] fk:focus-visible:border-ring fk:focus-visible:ring-[3px] fk:focus-visible:ring-ring/50 fk:aria-invalid:border-destructive fk:aria-invalid:ring-destructive/20 fk:dark:aria-invalid:ring-destructive/40 fk:[&>svg]:pointer-events-none fk:[&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'fk:bg-primary fk:text-primary-foreground fk:[a&]:hover:bg-primary/90',
        secondary: 'fk:bg-secondary fk:text-secondary-foreground fk:[a&]:hover:bg-secondary/90',
        destructive:
          'fk:bg-destructive fk:text-white fk:focus-visible:ring-destructive/20 fk:dark:bg-destructive/60 fk:dark:focus-visible:ring-destructive/40 fk:[a&]:hover:bg-destructive/90',
        outline: 'fk:border-border fk:text-foreground fk:[a&]:hover:bg-accent fk:[a&]:hover:text-accent-foreground',
        ghost: 'fk:[a&]:hover:bg-accent fk:[a&]:hover:text-accent-foreground',
        link: 'fk:text-primary fk:underline-offset-4 fk:[a&]:hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
