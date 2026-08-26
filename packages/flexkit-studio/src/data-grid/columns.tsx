import { ComponentType } from 'react';
import type { JSX } from 'react';
import type { CellContext, Column, ColumnDef, Row, Table } from '@tanstack/react-table';
import type { Attribute, InputType, SelectOptions } from '../core/types';
import type { AttributeValue } from '../graphql-client/types';
import { useAuth } from '../auth/auth-context';
import { filterAttributesForSpaces } from '../core/spaces';
import { useConfig } from '../core/config/config-context';
import { Checkbox } from '../ui/primitives/checkbox';
import { Boolean as BooleanPrefiewField } from './preview-components/boolean';
import { Text as TextPreviewField } from './preview-components/text';
import { Editor as EditorPreviewField } from './preview-components/editor';
import { Asset as AssetPreviewField } from './preview-components/asset';
import { DateTime as DateTimePreviewField } from './preview-components/datetime';
import { Select as SelectPreviewField } from './preview-components/select';
import { Tags as TagsPreviewField } from './preview-components/tags';
import { DataTableColumnHeader } from './data-table-column-header';

const SORTABLE_INPUT_TYPES = new Set<InputType>([
  'text',
  'textarea',
  'number',
  'datetime',
  'switch',
  'select',
  'editor',
]);

type Props<TData> = {
  attributesSchema: Attribute[];
  checkboxSelect?: 'single' | 'multiple'; // whether to include a checkbox column for row selection
  actionsComponent?: (row: Row<TData>) => JSX.Element; // a component to be displayed in the actions column of the grid
  enableColumnSorting?: boolean;
};

type ColumnDefinition<TData extends AttributeValue, TValue> = ColumnDef<TData, TValue> & { id?: string; size: number };

export function useGridColumnsDefinition<TData extends AttributeValue, TValue>({
  attributesSchema,
  checkboxSelect,
  actionsComponent,
  enableColumnSorting = false,
}: Props<TData>): ColumnDefinition<TData, TValue>[] {
  const { getContributionPointConfig } = useConfig();
  const [, auth] = useAuth();
  // Space-bound attributes are filtered out for non-members; their values are
  // null-ed by the server anyway, this just avoids rendering empty columns.
  const visibleAttributesSchema = filterAttributesForSpaces(attributesSchema, auth.user?.spaces);
  const inputTypeToPreviewFieldMap = {
    'datetime': 'datetime',
    'editor': 'editor',
    'asset': 'asset',
    'number': 'text',
    'relationship': 'text',
    'select': 'select',
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
    'select': SelectPreviewField,
    'switch': BooleanPrefiewField,
    'text': TextPreviewField,
    'textarea': TextPreviewField,
    'tags': TagsPreviewField,
  };

  const cols = visibleAttributesSchema
    .map((attribute) => {
      // System timestamp column is always appended last; skip schema duplicates.
      if (attribute.name === '_updatedAt') {
        return null;
      }

      const previewType =
        (attribute.inputType === 'relationship' && attribute.relationship?.entity === '_asset' ? 'asset' : undefined) ??
        attribute.previewType ??
        inputTypeToPreviewFieldMap[attribute.inputType as keyof typeof inputTypeToPreviewFieldMap];
      const previewComponent =
        (getContributionPointConfig('previewFields', [previewType])?.[0]?.component as unknown as
          | ComponentType<{ value: TData }>
          | undefined) ??
        previewFieldComponentsMap[previewType as keyof typeof previewFieldComponentsMap] ??
        previewFieldComponentsMap['text'];

      if (attribute.hidden === true) {
        return null;
      }

      const isTagsPreview = previewType === 'tags';
      // Only global scalars appear on Neo4j GraphQL `{entity}Sort`. Local fields are
      // emitted as relationships (e.g. brand.metaTitle → brand_metaTitle) and cannot be sorted.
      const canSort =
        enableColumnSorting &&
        attribute.scope === 'global' &&
        SORTABLE_INPUT_TYPES.has(attribute.inputType);

      return {
        accessorKey: attribute.name,
        filterFn: (row: Row<TData>, id: string, value: string | string[]) => {
          if (isTagsPreview) {
            return true;
          }

          const selectedValues = Array.isArray(value) ? value : [value];

          return selectedValues.includes(row.getValue(id));
        },
        header: ({ column }: { column: Column<TData, TValue> }) =>
          canSort ? (
            <DataTableColumnHeader column={column} title={attribute.label} />
          ) : (
            <div className="fk:flex fk:items-center">{attribute.label}</div>
          ),
        cell: ({ row }: CellContext<TData, TValue>) => {
          const PreviewComponent = previewComponent as ComponentType<{
            value: TData;
            options?: SelectOptions;
          }>;

          // TODO: Pass the complete row data to the preview component, so it can concatenate values from other attributes (i.e. for the "image dimensions" column)
          // console.log(row.getAllCells());
          if (previewType === 'select') {
            return (
              <PreviewComponent
                value={row.getValue(attribute.name)}
                options={attribute.options as SelectOptions | undefined}
              />
            );
          }

          return <PreviewComponent value={row.getValue(attribute.name)} />;
        },
        enableSorting: canSort,
        enableHiding: true,
        meta: {
          label: attribute.label,
        },
        size: attribute.options?.size ?? 150,
      };
    })
    .filter((column) => column !== null);

  const actions = {
    id: 'actions',
    cell: ({ row }: CellContext<TData, TValue>) => (actionsComponent ? actionsComponent(row) : null),
    size: 80,
  };

  const updatedAt = {
    accessorKey: '_updatedAt',
    header: ({ column }: { column: Column<TData, TValue> }) =>
      enableColumnSorting ? (
        <DataTableColumnHeader column={column} title="Updated At" />
      ) : (
        <div className="fk:flex fk:items-center">Updated At</div>
      ),
    cell: ({ row }: CellContext<TData, TValue>) => (
      <DateTimePreviewField value={row.getValue('_updatedAt')} />
    ),
    enableSorting: enableColumnSorting,
    enableHiding: false,
    meta: {
      label: 'Updated At',
    },
    size: 220,
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
        className="fk:dark:bg-white/15"
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
    updatedAt,
  ];
}
