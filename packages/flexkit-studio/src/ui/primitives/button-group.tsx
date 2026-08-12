import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { Separator } from './separator';

const buttonGroupVariants = cva(
  'fk:flex fk:w-fit fk:items-stretch fk:has-[>[data-slot=button-group]]:gap-2 fk:[&>*]:focus-visible:relative fk:[&>*]:focus-visible:z-10 fk:has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md fk:[&>[data-slot=select-trigger]:not([class*=w-])]:w-fit fk:[&>input]:flex-1',
  {
    variants: {
      orientation: {
        horizontal:
          'fk:[&>*:not(:first-child)]:rounded-l-none fk:[&>*:not(:first-child)]:border-l-0 fk:[&>*:not(:last-child)]:rounded-r-none',
        vertical:
          'fk:flex-col fk:[&>*:not(:first-child)]:rounded-t-none fk:[&>*:not(:first-child)]:border-t-0 fk:[&>*:not(:last-child)]:rounded-b-none',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  }
);

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : 'div';

  return (
    <Comp
      className={cn(
        'fk:bg-muted fk:shadow-xs fk:flex fk:items-center fk:gap-2 fk:rounded-md fk:border fk:px-4 fk:text-sm fk:font-medium fk:[&_svg:not([class*=size-])]:size-4 fk:[&_svg]:pointer-events-none',
        className
      )}
      {...props}
    />
  );
}

function ButtonGroupSeparator({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        'fk:bg-input fk:relative fk:!m-0 fk:self-stretch fk:data-[orientation=vertical]:h-auto',
        className
      )}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
