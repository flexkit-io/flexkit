import type { Attribute, Row } from '@flexkit/studio';
import { DataTableRowActions } from './data-table-row-actions';

type Props = {
  entityName: string;
  entityNamePlural: string;
  attributesSchema: Attribute[];
};

export function gridColumnsDefinition({ entityName, entityNamePlural, attributesSchema }: Props) {
  const cols = attributesSchema.map((attribute) => ({
    accessorKey: attribute.name,
    header: () => <div>{attribute.label}</div>,
    cell: ({ row }: { row: Row<unknown> }) => <div className="">{row.getValue(attribute.name)}</div>,
    enableSorting: false,
    enableHiding: true,
    size: attribute.options?.size ?? 150,
  }));

  const actions = {
    id: 'actions',
    cell: ({ row }: { row: Row<unknown> }) => (
      <DataTableRowActions entityName={entityName} entityNamePlural={entityNamePlural} row={row} />
    ),
    size: 50,
  };

  return [actions, ...cols];
}
