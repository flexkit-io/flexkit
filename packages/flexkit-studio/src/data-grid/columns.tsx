import { ComponentType } from 'react';
import type { CellContext, ColumnDef, Row, Table } from '@tanstack/react-table';
import type { Attribute } from '../core/types';
import type { AttributeValue } from '../graphql-client/types';
import { useConfig } from '../core/config/config-context';
import { Checkbox } from '../ui/primitives/checkbox';
import { Boolean as BooleanPrefiewField } from './preview-components/boolean';
import { Text as TextPreviewField } from './preview-components/text';
import { Editor as EditorPreviewField } from './preview-components/editor';
import { Asset as AssetPreviewField } from './preview-components/asset';
import { DateTime as DateTimePreviewField } from './preview-components/datetime';
import { Tags as TagsPreviewField } from './preview-components/tags';

type Props<TData> = {
  attributesSchema: Attribute[];
  checkboxSelect?: 'single' | 'multiple'; // whether to include a checkbox column for row selection
  actionsComponent?: (row: Row<TData>) => JSX.Element; // a component to be displayed in the actions column of the grid
};

type ColumnDefinition<TData extends AttributeValue, TValue> = ColumnDef<TData, TValue> & { id?: string; size: number };

export function useGridColumnsDefinition<TData extends AttributeValue, TValue>({
  attributesSchema,
  checkboxSelect,
  actionsComponent,
}: Props<TData>): ColumnDefinition<TData, TValue>[] {
  const { getContributionPointConfig } = useConfig();
  const inputTypeToPreviewFieldMap = {
    'datetime': 'datetime',
    'editor': 'editor',
    'asset': 'asset',
    'number': 'text',
    'relationship': 'text',
    'select': 'text',
    'switch': 'boolean',
    'text': 'text',
    'textarea': 'text',
  };
  const previewFieldComponentsMap = {
    'boolean': BooleanPrefiewField,
    'date': TextPreviewField,
    'datetime': DateTimePreviewField,
    'editor': EditorPreviewField,
    'asset': AssetPreviewField,
    'number': TextPreviewField,
    'relationship': TextPreviewField,
    'select': TextPreviewField,
    'switch': BooleanPrefiewField,
    'text': TextPreviewField,
    'textarea': TextPreviewField,
    'tags': TagsPreviewField,
  };

  const cols = attributesSchema
    .map((attribute) => {
      const previewType =
        attribute.previewType ??
        inputTypeToPreviewFieldMap[attribute.inputType as keyof typeof inputTypeToPreviewFieldMap];
      const previewComponent =
        (getContributionPointConfig('previewFields', [previewType])?.[0]?.component as unknown as
          | ComponentType<{ value: TData }>
          | undefined) ??
        previewFieldComponentsMap[previewType as keyof typeof previewFieldComponentsMap] ??
        previewFieldComponentsMap['text'];

      if (attribute.isHidden) {
        return null;
      }

      return {
        accessorKey: attribute.name,
        filterFn: (row: Row<TData>, id: string, value: string) => {
          return value.includes(row.getValue(id));
        },
        header: () => <div className="fk-flex fk-items-center">{attribute.label}</div>,
        cell: ({ row }: CellContext<TData, TValue>) => {
          const PreviewComponent = previewComponent as ComponentType<{ value: TData }>;

          // TODO: Pass the complete row data to the preview component, so it can concatenate values from other attributes (i.e. for the "image dimensions" column)
          // console.log(row.getAllCells());
          return <PreviewComponent value={row.getValue(attribute.name)} />;
        },
        enableSorting: false,
        enableHiding: true,
        size: attribute.options?.size ?? 150,
      };
    })
    .filter((column) => column !== null);

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
