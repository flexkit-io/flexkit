import type { CellContext, ColumnDef, Row, Table } from '@tanstack/react-table';
import type { Attribute } from '../core/types';
import type { AttributeValue } from '../graphql-client/types';
import { Checkbox } from '../ui/primitives/checkbox';

type Props<TData> = {
  attributesSchema: Attribute[];
  checkboxSelect?: 'single' | 'multiple'; // whether to include a checkbox column for row selection
  actionsComponent?: (row: Row<TData>) => JSX.Element; // a component to be displayed in the actions column of the grid
};

type ColumnDefinition<TData extends AttributeValue, TValue> = ColumnDef<TData, TValue> & { id?: string; size: number };

export function gridColumnsDefinition<TData extends AttributeValue, TValue>({
  attributesSchema,
  checkboxSelect,
  actionsComponent,
}: Props<TData>): ColumnDefinition<TData, TValue>[] {
  // TODO: Those should come dynamically from useMiddlewareComponent()
  const customPreviewComponents = {
    'image': (value: string) => <img src={value} alt="Preview" />,
  };
  const defaultPreviewComponent = {
    'boolean': (value: boolean) => <div className="fk-block fk-w-full fk-text-center">{value ? 'Yes' : 'No'}</div>,
    'text': (value: boolean) => <div className="fk-flex fk-items-center">{value}</div>,
    'number': (value: boolean) => <div className="fk-flex fk-items-center">{value}</div>,
    'date': (value: boolean) => <div className="fk-flex fk-items-center">{value}</div>,
    'datetime': (value: boolean) => <div className="fk-flex fk-items-center">{value}</div>,
    'editor': (value: boolean) => <div className="fk-flex fk-items-center">{value}</div>,
    'select': (value: boolean) => <div className="fk-flex fk-items-center">{value}</div>,
    'relationship': (value: boolean) => <div className="fk-flex fk-items-center">{value}</div>,
    'switch': (value: boolean) => <div className="fk-block fk-w-full fk-text-center">{value ? 'Yes' : 'No'}</div>,
    'textarea': (value: boolean) => <div className="fk-flex fk-items-center">{value}</div>,
  };

  const cols = attributesSchema.map((attribute) => {
    const previewType =
      attribute.previewType ?? (attribute.inputType as keyof typeof defaultPreviewComponent | 'image');
    // console.log('previewType', previewType);
    const previewComponent =
      customPreviewComponents[previewType as keyof typeof customPreviewComponents] ??
      defaultPreviewComponent[previewType as keyof typeof defaultPreviewComponent] ??
      defaultPreviewComponent['text'];

    return {
      accessorKey: attribute.name,
      header: () => <div className="fk-flex fk-items-center">{attribute.label}</div>,
      cell: ({ row }: CellContext<TData, TValue>) => {
        return previewComponent(row.getValue(attribute.name));
      },
      enableSorting: false,
      enableHiding: true,
      size: attribute.options?.size ?? 150,
    };
  });

  const actions = {
    id: 'actions',
    cell: ({ row }: CellContext<TData, TValue>) => (actionsComponent ? actionsComponent(row) : null),
    size: 80,
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
