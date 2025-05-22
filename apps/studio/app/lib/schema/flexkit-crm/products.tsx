import { Package } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const crmProducts = defineEntity({
  name: 'product',
  plural: 'products',
  menu: {
    label: 'Products',
    group: 'sales',
    icon: <Package />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Product Name',
      scope: 'local',
      options: {
        size: 260,
        comment: 'Name of the product',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Product name is required' }),
      defaultValue: '',
    },
    {
      name: 'sku',
      label: 'SKU',
      scope: 'global',
      options: {
        size: 160,
        comment: 'Stock Keeping Unit code',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      validation: (z) => z.string().min(1, { message: 'SKU is required' }),
      defaultValue: '',
    },
    {
      name: 'description',
      label: 'Description',
      scope: 'local',
      options: {
        size: 260,
        comment: 'Description of the product',
      },
      dataType: 'string',
      inputType: 'textarea',
      defaultValue: '',
    },
    {
      name: 'price',
      label: 'Price',
      scope: 'local',
      options: {
        size: 160,
        comment: 'Price of the product',
      },
      dataType: 'float',
      inputType: 'number',
      validation: (z) => z.number().min(0, { message: 'Price must be a positive number' }),
      defaultValue: '',
    },
    {
      name: 'currency',
      label: 'Currency',
      scope: 'relationship',
      options: {
        size: 120,
        comment: 'Currency of the product price',
      },
      dataType: 'string',
      inputType: 'relationship',
      defaultValue: '',
      relationship: {
        mode: 'single',
        field: 'code',
        entity: 'currency',
      },
    },
    {
      name: 'category',
      label: 'Category',
      scope: 'global',
      options: {
        list: [
          { label: 'Software', value: 'software' },
          { label: 'Hardware', value: 'hardware' },
          { label: 'Service', value: 'service' },
          { label: 'Subscription', value: 'subscription' },
          { label: 'Other', value: 'other' },
        ],
        size: 180,
        comment: 'Category of the product',
      },
      dataType: 'string',
      inputType: 'select',
      defaultValue: '',
    },
    {
      name: 'isActive',
      label: 'Active',
      scope: 'global',
      options: {
        size: 120,
        comment: 'Whether this product is active',
      },
      dataType: 'boolean',
      inputType: 'switch',
      defaultValue: '',
    },
    {
      name: 'image',
      label: 'Product Image',
      options: {
        accept: 'image/*',
        size: 160,
        comment: 'Image of the product',
      },
      dataType: 'image',
      inputType: 'image',
      scope: 'global',
      defaultValue: '',
    },
  ],
});
