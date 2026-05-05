import * as React from 'react';
import { cn } from 'src/ui/lib/utils';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="fk:relative fk:h-full fk:w-full fk:overflow-x-auto fk:rounded-t-md fk:border-border fk:border"
    >
      <table data-slot="table" className={cn('fk:w-full fk:caption-bottom fk:text-sm', className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('fk:[&_tr]:border-b', className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('fk:[&_tr:last-child]:border-0', className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('fk:border-t fk:bg-muted/50 fk:font-medium fk:[&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'fk:border-b fk:transition-colors fk:hover:bg-muted/50 fk:has-aria-expanded:bg-muted/50 fk:data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'fk:h-10 fk:px-4 fk:text-left fk:align-middle fk:font-medium fk:whitespace-nowrap fk:text-foreground fk:[&:has([role=checkbox])]:pr-0 fk:[&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'fk:px-4 fk:py-1 fk:align-middle fk:whitespace-nowrap fk:[&:has([role=checkbox])]:pr-0 fk:[&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('fk:mt-4 fk:text-sm fk:text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
