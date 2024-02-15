import type { Attribute } from '@flexkit/studio';
import { DataTableRowActions } from './data-table-row-actions';

export function gridColumnsDefinition(attributesSchema: Attribute[]) {
  const cols = attributesSchema.map((attribute) => ({
    accessorKey: attribute.name,
    header: ({ column }) => <div>{attribute.label}</div>,
    cell: ({ row }) => <div className="">{row.getValue(attribute.name)}</div>,
    enableSorting: false,
    enableHiding: true,
    size: attribute.options?.size ?? 150,
  }));

  const actions = {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
    size: 60,
  };

  return [actions, ...cols];
}
