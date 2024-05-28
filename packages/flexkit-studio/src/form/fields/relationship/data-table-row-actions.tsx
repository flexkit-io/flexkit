'use client';

import { Trash2 } from 'lucide-react';
import type { Row } from '@tanstack/react-table';
import { Button } from '../../../ui/primitives/button';

interface DataTableRowActionsProps<TData> {
  action: (entityId: string) => void;
  row: Row<TData>;
}

export function DataTableRowActions<TData>({ action, row }: DataTableRowActionsProps<TData>): JSX.Element {
  // @ts-expect-error -- the DataGrid's origina type doesn't know about the _id property
  const entityId = row.original._id as string;

  function handleDelete(): void {
    action(entityId);
  }

  return (
    <div className="fk-flex">
      <Button className="fk-flex fk-h-7 fk-w-7 fk-p-0 fk-mr-1" onClick={handleDelete} variant="ghost">
        <Trash2 className="fk-h-4 fk-w-4" />
        <span className="fk-sr-only">Delete</span>
      </Button>
    </div>
  );
}
