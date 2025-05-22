import { defineEntity } from '@flexkit/studio/ssr';

export const salesOrderItems = defineEntity({
  name: 'salesOrderItem',
  plural: 'salesOrderItems',
  menu: {
    label: 'Sales Order Items',
    hidden: true,
  },
  attributes: [
    {
      name: 'sku',
      label: 'SKU',
      scope: 'global',
      options: {
        size: 130,
        comment: 'Unique SKU identifier',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'SKU is required' }),
      defaultValue: '',
    },
    {
      name: 'name',
      label: 'Name',
      scope: 'global',
      options: {
        size: 260,
        comment: 'The name of the product',
      },
      dataType: 'string',
      inputType: 'text',
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'quantity',
      label: 'Quantity',
      scope: 'global',
      options: {
        size: 260,
        comment: 'The name of the product',
      },
      dataType: 'int',
      inputType: 'number',
      validation: (z) => z.number().min(1, { message: 'Quantity is required' }),
      defaultValue: '',
    },
    {
      name: 'price',
      label: 'Price',
      scope: 'global',
      options: {
        size: 130,
        comment: 'The price of the product',
      },
      dataType: 'float',
      inputType: 'number',
      previewType: 'text',
      validation: (z) => z.number().min(1, { message: 'Price is required' }),
      defaultValue: '',
    },
    {
      name: 'rowTotal',
      label: 'Row Total',
      scope: 'global',
      options: {
        size: 130,
        comment: 'The total price of the row',
      },
      dataType: 'float',
      inputType: 'number',
      previewType: 'text',
      validation: (z) => z.number().min(1, { message: 'Row total is required' }),
      defaultValue: '',
    },
    {
      name: 'product',
      label: 'Product',
      scope: 'relationship',
      options: {
        size: 160,
      },
      dataType: 'string',
      inputType: 'relationship',
      defaultValue: '',
      relationship: {
        mode: 'single',
        field: 'name',
        entity: 'product',
      },
    },
  ],
});
