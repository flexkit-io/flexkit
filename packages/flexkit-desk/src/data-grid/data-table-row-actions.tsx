'use client';

import { Pencil } from 'lucide-react';
import { Button, Row, useDispatch } from '@flexkit/studio';

interface DataTableRowActionsProps<TData> {
  entityNamePlural: string;
  row: Row<TData>;
}

export function DataTableRowActions<TData>({ entityNamePlural, row }: DataTableRowActionsProps<TData>) {
  const actionDispatch = useDispatch();
  // @ts-expect-error -- the DataGrid's origina type doesn't know about the _id property
  const entityId = row.original._id;

  function handleEdit() {
    actionDispatch({ type: 'editEntity', payload: { entityId, entityNamePlural } });
  }

  return (
    <Button className="fk-flex fk-h-7 fk-w-10 fk-p-0" onClick={handleEdit} variant="ghost">
      <Pencil className="fk-h-4 fk-w-4" />
      <span className="fk-sr-only">Edit</span>
    </Button>
  );
}
