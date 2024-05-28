import type { CellContext, ColumnDef, Table } from '@tanstack/react-table';
import type { Attribute } from '../core/types';
import { Checkbox } from '../ui/primitives/checkbox';

type Props = {
  attributesSchema: Attribute[];
  checkboxSelect?: 'single' | 'multiple'; // whether to include a checkbox column for row selection
  actionsComponent?: (row: unknown) => JSX.Element; // a component to be displayed in the actions column of the grid
};

type ColumnDefinition<TData, TValue> = ColumnDef<TData, TValue> & { id?: string; size: number };

export function gridColumnsDefinition<TData, TValue>({
  attributesSchema,
  checkboxSelect,
  actionsComponent,
}: Props): ColumnDefinition<TData, TValue>[] {
  const cols = attributesSchema.map((attribute) => ({
    accessorKey: attribute.name,
    header: () => <div>{attribute.label}</div>,
    cell: ({ row }: CellContext<TData, TValue>) => <div className="">{row.getValue(attribute.name)}</div>,
    enableSorting: false,
    enableHiding: true,
    size: attribute.options?.size ?? 150,
  }));

  const actions = {
    id: 'actions',
    cell: ({ row }: CellContext<TData, TValue>) => (actionsComponent ? actionsComponent(row) : null),
    size: 50,
  };

  const singleCheckboxSelect = {
    id: 'select',
    cell: ({ row, table }: CellContext<TData, TValue>) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          table.toggleAllPageRowsSelected(false);
          row.toggleSelected(Boolean(value));
        }}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 50,
  };

  const multipleCheckboxSelect = {
    id: 'select',
    header: ({ table }: { table: Table<unknown> }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(value) => {
          table.toggleAllPageRowsSelected(Boolean(value));
        }}
      />
    ),
    cell: ({ row }: CellContext<TData, TValue>) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          row.toggleSelected(Boolean(value));
        }}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 50,
  };

  return [
    ...(checkboxSelect === 'single' ? [singleCheckboxSelect] : []),
    ...(checkboxSelect === 'multiple' ? [multipleCheckboxSelect] : []),
    ...(actionsComponent ? [actions] : []),
    ...cols,
  ];
}
