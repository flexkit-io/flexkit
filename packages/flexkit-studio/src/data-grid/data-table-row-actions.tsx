'use client';

import type { JSX } from 'react';
import { Ellipsis, PencilIcon, Trash2Icon } from 'lucide-react';
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
import { useCanMutate } from '../core/permissions';

interface DataTableRowActionsProps<TData> {
  entityName: string;
  entityNamePlural: string;
  row: Row<TData>;
  options?: {
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
  const canMutate = useCanMutate();
  // @ts-expect-error -- the DataGrid's original type doesn't know about the _id property
  const entityId = row.original._id;
  // Read-only roles keep the pencil (the drawer doubles as their read view)
  // but lose the delete affordance entirely.
  const canDelete = (options.canDelete ?? true) && canMutate;
  const canEdit = options.canEdit ?? true;

  function handleEdit(): void {
    actionDispatch({ type: 'EditEntity', payload: { entityId, entityNamePlural } });
  }

  function handleDelete(): void {
    actionDispatch({ type: 'DeleteEntity', payload: { entityId, entityName } });
  }

  return (
    <div className="fk:flex">
      {canEdit && (
        <Button className="fk:flex fk:h-7 fk:w-7 fk:p-0 fk:mr-1" onClick={handleEdit} variant="ghost">
          <PencilIcon className="fk:h-4 fk:w-4" />
          <span className="fk:sr-only">Edit</span>
        </Button>
      )}
      {canDelete && !canEdit && (
        <Button className="fk:flex fk:h-7 fk:w-7 fk:p-0 fk:mr-1" onClick={handleDelete} variant="ghost">
          <Trash2Icon className="fk:h-4 fk:w-4" />
          <span className="fk:sr-only">Delete</span>
        </Button>
      )}
      {canEdit && canDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="fk:flex fk:h-7 fk:w-7 fk:p-0" variant="ghost">
              <Ellipsis className="fk:h-4 fk:w-4" />
              <span className="fk:sr-only">Additional actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={handleEdit}>
              <PencilIcon className="fk:mr-2 fk:h-4 fk:w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="fk:text-destructive" onClick={handleDelete}>
              <Trash2Icon className="fk:mr-2 fk:h-4 fk:w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
