'use client';

import { Ellipsis, Pencil, Trash2 } from 'lucide-react';
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
  options: {
    canDelete?: boolean;
    canEdit?: boolean;
  };
}

export function DataTableRowActions<TData>({
  entityName,
  entityNamePlural,
  row,
  options = { canDelete: true, canEdit: true },
}: DataTableRowActionsProps<TData>): JSX.Element {
  const actionDispatch = useDispatch();
  // @ts-expect-error -- the DataGrid's original type doesn't know about the _id property
  const entityId = row.original._id;

  function handleEdit(): void {
    actionDispatch({ type: 'EditEntity', payload: { entityId, entityNamePlural } });
  }

  function handleDelete(): void {
    actionDispatch({ type: 'DeleteEntity', payload: { entityId, entityName } });
  }

  return (
    <div className="fk-flex">
      {options.canEdit && (
        <Button className="fk-flex fk-h-7 fk-w-7 fk-p-0 fk-mr-1" onClick={handleEdit} variant="ghost">
          <Pencil className="fk-h-4 fk-w-4" />
          <span className="fk-sr-only">Edit</span>
        </Button>
      )}
      {options.canDelete && !options.canEdit && (
        <Button className="fk-flex fk-h-7 fk-w-7 fk-p-0 fk-mr-1" onClick={handleDelete} variant="ghost">
          <Trash2 className="fk-h-4 fk-w-4" />
          <span className="fk-sr-only">Delete</span>
        </Button>
      )}
      {options.canEdit && options.canDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="fk-flex fk-h-7 fk-w-7 fk-p-0" variant="ghost">
              <Ellipsis className="fk-h-4 fk-w-4" />
              <span className="fk-sr-only">Additional actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
