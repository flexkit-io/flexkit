'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { Slot } from 'radix-ui';

import { Button } from './button';

const attachmentVariants = cva(
  'fk:group/attachment fk:relative fk:flex fk:w-fit fk:max-w-full fk:min-w-0 fk:shrink-0 fk:flex-wrap fk:rounded-xl fk:border fk:bg-card fk:text-card-foreground fk:transition-colors fk:focus-within:ring-1 fk:focus-within:ring-ring/50 fk:has-[>a,>button]:hover:bg-muted/50 fk:data-[state=error]:border-destructive/30 fk:data-[state=idle]:border-dashed fk:corner-squircle',
  {
    variants: {
      size: {
        default:
          'fk:gap-2 fk:text-sm fk:has-data-[slot=attachment-content]:px-2.5 fk:has-data-[slot=attachment-content]:py-2 fk:has-data-[slot=attachment-media]:p-2',
        sm: 'fk:gap-2.5 fk:text-xs fk:has-data-[slot=attachment-content]:px-2 fk:has-data-[slot=attachment-content]:py-1.5 fk:has-data-[slot=attachment-media]:p-1.5',
        xs: 'fk:gap-1.5 fk:rounded-lg fk:text-xs fk:has-data-[slot=attachment-content]:px-1.5 fk:has-data-[slot=attachment-content]:py-1 fk:has-data-[slot=attachment-media]:p-1',
      },
      orientation: {
        horizontal: 'fk:min-w-40 fk:items-center',
        vertical: 'fk:w-24 fk:flex-col fk:has-data-[slot=attachment-content]:w-30',
      },
    },
  }
);

function Attachment({
  className,
  state = 'done',
  size = 'default',
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof attachmentVariants> & {
    state?: 'idle' | 'uploading' | 'processing' | 'error' | 'done';
  }) {
  return (
    <div
      data-slot="attachment"
      data-state={state}
      data-size={size}
      data-orientation={orientation}
      className={cn(attachmentVariants({ size, orientation }), className)}
      {...props}
    />
  );
}

const attachmentMediaVariants = cva(
  'fk:relative fk:flex fk:aspect-square fk:w-10 fk:shrink-0 fk:items-center fk:justify-center fk:overflow-hidden fk:rounded-lg fk:bg-muted fk:text-foreground fk:group-data-[orientation=vertical]/attachment:w-full fk:group-data-[size=sm]/attachment:w-8 fk:group-data-[size=xs]/attachment:w-7 fk:group-data-[size=xs]/attachment:rounded-md fk:group-data-[state=error]/attachment:bg-destructive/10 fk:group-data-[state=error]/attachment:text-destructive fk:group-data-[orientation=vertical]/attachment:*:data-[slot=spinner]:size-6! fk:[&_svg]:pointer-events-none fk:[&_svg:not([class*=size-])]:size-4 fk:group-data-[orientation=vertical]/attachment:[&_svg:not([class*=size-])]:size-6 fk:group-data-[size=xs]/attachment:[&_svg:not([class*=size-])]:size-3.5 fk:corner-squircle',
  {
    variants: {
      variant: {
        icon: '',
        image:
          'fk:opacity-60 fk:group-data-[state=done]/attachment:opacity-100 fk:group-data-[state=idle]/attachment:opacity-100 fk:*:[img]:aspect-square fk:*:[img]:w-full fk:*:[img]:object-cover',
      },
    },
    defaultVariants: {
      variant: 'icon',
    },
  }
);

function AttachmentMedia({
  className,
  variant = 'icon',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof attachmentMediaVariants>) {
  return (
    <div
      data-slot="attachment-media"
      data-variant={variant}
      className={cn(attachmentMediaVariants({ variant }), className)}
      {...props}
    />
  );
}

function AttachmentContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="attachment-content"
      className={cn(
        'fk:max-w-full fk:min-w-0 fk:flex-1 fk:leading-tight fk:group-data-[orientation=vertical]/attachment:px-1',
        className
      )}
      {...props}
    />
  );
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="attachment-title"
      className={cn(
        'fk:block fk:max-w-full fk:min-w-0 fk:truncate fk:font-medium fk:group-data-[state=processing]/attachment:shimmer fk:group-data-[state=uploading]/attachment:shimmer',
        className
      )}
      {...props}
    />
  );
}

function AttachmentDescription({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="attachment-description"
      className={cn(
        'fk:mt-0.5 fk:block fk:min-w-0 fk:truncate fk:text-xs fk:text-muted-foreground fk:group-data-[state=error]/attachment:text-destructive/80',
        'fk:max-w-full',
        className
      )}
      {...props}
    />
  );
}

function AttachmentActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn(
        'fk:relative fk:z-20 fk:flex fk:shrink-0 fk:items-center fk:group-data-[orientation=vertical]/attachment:absolute fk:group-data-[orientation=vertical]/attachment:top-3 fk:group-data-[orientation=vertical]/attachment:right-3 fk:group-data-[orientation=vertical]/attachment:gap-1',
        className
      )}
      {...props}
    />
  );
}

function AttachmentAction({ className, variant, size = 'icon-xs', ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="attachment-action"
      variant={variant ?? 'ghost'}
      size={size}
      className={cn(className)}
      {...props}
    />
  );
}

function AttachmentTrigger({
  className,
  asChild = false,
  type,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="attachment-trigger"
      type={asChild ? undefined : (type ?? 'button')}
      className={cn('fk:absolute fk:inset-0 fk:z-10 fk:outline-none', className)}
      {...props}
    />
  );
}

function AttachmentGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="attachment-group"
      className={cn(
        'fk:flex fk:min-w-0 fk:scroll-fade-x fk:snap-x fk:snap-mandatory fk:scroll-px-1 fk:gap-3 fk:overflow-x-auto fk:overscroll-x-contain fk:py-1 fk:*:data-[slot=attachment]:flex-none fk:*:data-[slot=attachment]:snap-start',
        className
      )}
      {...props}
    />
  );
}

export {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
};
