'use client';

import { Ellipsis, Pencil } from 'lucide-react';
import type { Row } from '@tanstack/react-table';
import { Button } from '../ui/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/primitives/dropdown-menu';
import { useDispatch } from '../entities/actions-context';

interface DataTableRowActionsProps<TData> {
  entityName: string;
  entityNamePlural: string;
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  entityName,
  entityNamePlural,
  row,
}: DataTableRowActionsProps<TData>): JSX.Element {
  const actionDispatch = useDispatch();
  // @ts-expect-error -- the DataGrid's origina type doesn't know about the _id property
  const entityId = row.original._id;

  function handleEdit(): void {
    actionDispatch({ type: 'editEntity', payload: { entityId, entityNamePlural } });
  }

  function handleDelete(): void {
    actionDispatch({ type: 'deleteEntity', payload: { entityId, entityName } });
  }

  return (
    <div className="fk-flex">
      <Button className="fk-flex fk-h-7 fk-w-7 fk-p-0 fk-mr-1" onClick={handleEdit} variant="ghost">
        <Pencil className="fk-h-4 fk-w-4" />
        <span className="fk-sr-only">Edit</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="fk-flex fk-h-7 fk-w-7 fk-p-0" variant="ghost">
            <Ellipsis className="fk-h-4 fk-w-4" />
            <span className="fk-sr-only">Additional actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
