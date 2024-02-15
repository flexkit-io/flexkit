'use client';

import { Pencil } from 'lucide-react';
import { Row } from '@flexkit/studio';
import { Button } from '@flexkit/studio';

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({ row }: DataTableRowActionsProps<TData>) {
  //console.log(row.original._id);

  return (
    <Button variant="ghost" className="fk-flex fk-h-7 fk-w-10 fk-p-0">
      <Pencil className="fk-h-4 fk-w-4" />
      <span className="fk-sr-only">Edit</span>
    </Button>
  );
}
