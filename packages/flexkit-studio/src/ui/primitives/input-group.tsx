'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        'fk:group/input-group fk:border-input fk:dark:bg-input/30 fk:shadow-xs fk:relative fk:flex fk:w-full fk:items-center fk:rounded-md fk:border fk:outline-none fk:transition-[color,box-shadow]',
        'fk:h-9 fk:has-[>textarea]:h-auto',
        'fk:has-[>[data-align=inline-start]]:[&>input]:pl-2',
        'fk:has-[>[data-align=inline-end]]:[&>input]:pr-2',
        'fk:has-[>[data-align=block-start]]:h-auto fk:has-[>[data-align=block-start]]:flex-col fk:has-[>[data-align=block-start]]:[&>input]:pb-3',
        'fk:has-[>[data-align=block-end]]:h-auto fk:has-[>[data-align=block-end]]:flex-col fk:has-[>[data-align=block-end]]:[&>input]:pt-3',
        'fk:has-[[data-slot=input-group-control]:focus-visible]:ring-ring fk:has-[[data-slot=input-group-control]:focus-visible]:ring-1',
        'fk:has-[[data-slot][aria-invalid=true]]:ring-destructive/20 fk:has-[[data-slot][aria-invalid=true]]:border-destructive fk:dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
        className
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  'fk:text-muted-foreground fk:flex fk:h-auto fk:cursor-text fk:select-none fk:items-center fk:justify-center fk:gap-2 fk:py-1.5 fk:text-sm fk:font-medium fk:group-data-[disabled=true]/input-group:opacity-50 fk:[&>kbd]:rounded-[calc(var(--radius)-5px)] fk:[&>svg:not([class*=size-])]:size-4',
  {
    variants: {
      align: {
        'inline-start':
          'fk:order-first fk:pl-3 fk:has-[>button]:ml-[-0.45rem] fk:has-[>kbd]:ml-[-0.35rem]',
        'inline-end':
          'fk:order-last fk:pr-3 fk:has-[>button]:mr-[-0.4rem] fk:has-[>kbd]:mr-[-0.35rem]',
        'block-start':
          'fk:[.border-b]:pb-3 fk:order-first fk:w-full fk:justify-start fk:px-3 fk:pt-3 fk:group-has-[>input]/input-group:pt-2.5',
        'block-end':
          'fk:[.border-t]:pt-3 fk:order-last fk:w-full fk:justify-start fk:px-3 fk:pb-3 fk:group-has-[>input]/input-group:pb-2.5',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  }
);

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }

        e.currentTarget.parentElement?.querySelector('input')?.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva('fk:flex fk:items-center fk:gap-2 fk:text-sm fk:shadow-none', {
  variants: {
    size: {
      xs: 'fk:h-6 fk:gap-1 fk:rounded-[calc(var(--radius)-5px)] fk:px-2 fk:has-[>svg]:px-2 fk:[&>svg:not([class*=size-])]:size-3.5',
      sm: 'fk:h-8 fk:gap-1.5 fk:rounded-md fk:px-2.5 fk:has-[>svg]:px-2.5',
      'icon-xs': 'fk:size-6 fk:rounded-[calc(var(--radius)-5px)] fk:p-0 fk:has-[>svg]:p-0',
      'icon-sm': 'fk:size-8 fk:p-0 fk:has-[>svg]:p-0',
    },
  },
  defaultVariants: {
    size: 'xs',
  },
});

function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'size'> & VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'fk:text-muted-foreground fk:flex fk:items-center fk:gap-2 fk:text-sm fk:[&_svg:not([class*=size-])]:size-4 fk:[&_svg]:pointer-events-none',
        className
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        'fk:flex-1 fk:rounded-none fk:border-0 fk:bg-transparent fk:shadow-none fk:focus-visible:ring-0 fk:dark:bg-transparent',
        className
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        'fk:flex-1 fk:resize-none fk:rounded-none fk:border-0 fk:bg-transparent fk:py-3 fk:shadow-none fk:focus-visible:ring-0 fk:dark:bg-transparent',
        className
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
