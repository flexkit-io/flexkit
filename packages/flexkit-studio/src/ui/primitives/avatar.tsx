'use client';

import * as React from 'react';
import { Avatar as AvatarPrimitive } from 'radix-ui';
import { cn } from 'src/ui/lib/utils';

function Avatar({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: 'default' | 'sm' | 'lg';
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        'fk:group/avatar fk:relative fk:flex fk:size-8 fk:shrink-0 fk:overflow-hidden fk:rounded-full fk:select-none fk:data-[size=lg]:size-10 fk:data-[size=sm]:size-6',
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('fk:aspect-square fk:size-full', className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'fk:flex fk:size-full fk:items-center fk:justify-center fk:rounded-full fk:bg-muted fk:text-sm fk:text-muted-foreground fk:group-data-[size=sm]/avatar:text-xs',
        className
      )}
      {...props}
    />
  );
}

function AvatarBadge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        'fk:absolute fk:right-0 fk:bottom-0 fk:z-10 fk:inline-flex fk:items-center fk:justify-center fk:rounded-full fk:bg-primary fk:text-primary-foreground fk:ring-2 fk:ring-background fk:select-none',
        'fk:group-data-[size=sm]/avatar:size-2 fk:group-data-[size=sm]/avatar:[&>svg]:hidden',
        'fk:group-data-[size=default]/avatar:size-2.5 fk:group-data-[size=default]/avatar:[&>svg]:size-2',
        'fk:group-data-[size=lg]/avatar:size-3 fk:group-data-[size=lg]/avatar:[&>svg]:size-2',
        className
      )}
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        'fk:group/avatar-group fk:flex fk:-space-x-2 fk:*:data-[slot=avatar]:ring-2 fk:*:data-[slot=avatar]:ring-background',
        className
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        'fk:relative fk:flex fk:size-8 fk:shrink-0 fk:items-center fk:justify-center fk:rounded-full fk:bg-muted fk:text-sm fk:text-muted-foreground fk:ring-2 fk:ring-background fk:group-has-data-[size=lg]/avatar-group:size-10 fk:group-has-data-[size=sm]/avatar-group:size-6 fk:[&>svg]:size-4 fk:group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 fk:group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount };
