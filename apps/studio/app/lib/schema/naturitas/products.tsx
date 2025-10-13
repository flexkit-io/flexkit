import { Tag as TagIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const products = defineEntity({
  name: 'product',
  plural: 'products',
  menu: {
    label: 'Products',
    group: 'catalog',
    icon: <TagIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'local',
      options: {
        size: 260,
        comment: 'The name of the product',
      },
      dataType: 'string', // <-- This is the data type of the attribute, it directly affects how the data is saved in the database
      inputType: 'text', // <-- This affects how the data is displayed in the form (text input, select, WYSIWYG editor, textarea, etc)
      previewType: 'text', // <-- This affects how the data is displayed in the list view (text, image, boolean, WYSIWYG preview, etc)
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'sku',
      label: 'SKU',
      scope: 'global',
      options: {
        size: 130,
        comment: 'Unique SKU identifier',
      },
      dataType: 'string',
      isSearchable: true,
      isUnique: true,
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'SKU is required' }),
      defaultValue: '',
    },
    {
      name: 'productType',
      label: 'Product Type',
      scope: 'global',
      options: {
        list: [
          {
            label: 'Simple',
            value: 'simple',
          },
          {
            label: 'Configurable',
            value: 'configurable',
          },
          // For grouped lists with a label for each group:
          // {
          //   groupLabel: 'Type II',
          //   items: [
          //     {
          //       label: 'Grouped',
          //       value: 'grouped',
          //     },
          //     {
          //       label: 'Another',
          //       value: 'another',
          //     },
          //   ],
          // },
        ],
        placeholder: 'Select a product type',
        size: 140,
        comment: 'Type of Magento product: simple or configurable',
      },
      dataType: 'string',
      isUnique: false,
      inputType: 'select',
      validation: (z) => z.string().min(1, { message: 'Product type is required' }),
      defaultValue: 'simple',
    },
    {
      name: 'description',
      label: 'Description',
      scope: 'local',
      options: {
        size: 260,
        comment: 'Full description of the product',
      },
      dataType: 'string',
      inputType: 'editor',
      defaultValue: '',
    },
    {
      name: 'brand',
      label: 'Brand',
      scope: 'relationship',
      options: {
        size: 260,
        comment: 'Brand of the product (i.e. Solgar, Naturitas Essentials, etc)',
      },
      dataType: 'string',
      inputType: 'relationship',
      isSearchable: true,
      defaultValue: '',
      relationship: {
        mode: 'single',
        field: 'name',
        entity: 'brand',
      },
      // TODO: figure out how to validate relationship fields
      // validation: (z) => z.string().min(1, { message: 'Brand is required' }),
    },
    {
      name: 'flags',
      label: 'Flags',
      scope: 'relationship',
      options: {
        size: 260,
        comment: 'Product flags (Bio, 100% Natural, etc)',
      },
      dataType: 'string',
      inputType: 'relationship',
      defaultValue: '',
      relationship: {
        mode: 'multiple',
        field: 'name',
        entity: 'flag',
      },
    },
    {
      name: 'category',
      label: 'Category',
      scope: 'relationship',
      options: {
        size: 260,
        comment: 'Each product belongs to one and only one category',
      },
      dataType: 'string',
      inputType: 'relationship',
      isSearchable: true,
      defaultValue: '',
      relationship: {
        mode: 'single',
        field: 'name',
        entity: 'category',
      },
    },
    {
      name: 'mainImage',
      label: 'Main Image',
      options: {
        accept: 'image/*',
        size: 160,
        comment: 'The main image of the product',
      },
      dataType: 'asset',
      inputType: 'asset',
      scope: 'global', // TODO: Images have global scope. The type should be adjusted to not require a scope when inputType is image
      defaultValue: '',
    },
    {
      name: 'price',
      label: 'Price',
      scope: 'local',
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
      name: 'pvpr',
      label: 'PVPR',
      scope: 'local',
      options: {
        size: 130,
        comment: 'Precio de Venta Público Recomendado',
      },
      dataType: 'float',
      inputType: 'number',
      previewType: 'text',
      validation: (z) => z.number().min(1, { message: 'PVPR is required' }),
      defaultValue: '',
    },
    {
      name: 'specialPrice',
      label: 'Special Price',
      scope: 'local',
      options: {
        size: 130,
        comment: 'Special price of the product',
      },
      dataType: 'float',
      inputType: 'number',
      defaultValue: '',
    },
    {
      name: 'specialPriceFrom',
      label: 'Special Price From',
      scope: 'local',
      options: {
        size: 240,
        comment: 'Initial date and time of the special price',
      },
      dataType: 'datetime',
      inputType: 'datetime',
      defaultValue: '',
    },
    {
      name: 'specialPriceTo',
      label: 'Special Price To',
      scope: 'local',
      options: {
        size: 240,
        comment: 'Final date and time of the special price',
      },
      dataType: 'datetime',
      inputType: 'datetime',
      defaultValue: '',
    },
  ],
});
