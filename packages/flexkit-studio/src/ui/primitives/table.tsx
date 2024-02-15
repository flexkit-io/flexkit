import * as React from 'react';
import { cn } from 'src/ui/lib/utils';

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="fk-relative fk-w-full fk-overflow-auto">
      <table className={cn('fk-w-full fk-caption-bottom fk-text-sm', className)} ref={ref} {...props} />
    </div>
  )
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      className={cn('[&_tr]:fk-border-border [&_tr]:fk-border-border [&_tr]:fk-border-b', className)}
      ref={ref}
      {...props}
    />
  )
);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody className={cn('[&_tr:last-child]:fk-border-0', className)} ref={ref} {...props} />
  )
);
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      className={cn('fk-border-border fk-border-t fk-bg-muted/50 fk-font-medium [&>tr]:last:fk-border-b-0', className)}
      ref={ref}
      {...props}
    />
  )
);
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      className={cn(
        'fk-border-border fk-border-b fk-transition-colors hover:fk-bg-muted/50 data-[state=selected]:fk-bg-muted',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, style, ...props }, ref) => {
    return (
      <th
        className={cn(
          'fk-h-10 fk-px-4 fk-text-left fk-align-middle fk-font-medium fk-text-muted-foreground [&:has([role=checkbox])]:fk-pr-0',
          className
        )}
        ref={ref}
        {...props}
        style={style}
      />
    );
  }
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td className={cn('fk-p-2 fk-align-middle [&:has([role=checkbox])]:fk-pr-0', className)} ref={ref} {...props} />
  )
);
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption className={cn('fk-mt-4 fk-text-sm fk-text-muted-foreground', className)} ref={ref} {...props} />
  )
);
TableCaption.displayName = 'TableCaption';

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
