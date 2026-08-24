import { Store as StoreIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const brands = defineEntity({
  name: 'brand',
  plural: 'brands',
  display: 'name',
  menu: {
    label: 'Brands',
    group: 'catalog',
    icon: <StoreIcon />,
  },
  spaces: ['mkt'],
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'global',
      options: {
        size: 200,
        comment: 'The name of the brand',
      },
      dataType: 'string',
      unique: true,
      searchable: true,
      inputType: 'text',
      validation: (z) => z.string().min(1, { error: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'slug',
      label: 'Slug',
      scope: 'global',
      options: {
        size: 260,
        comment: 'URL slug',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { error: 'Slug is required' }),
      defaultValue: '',
    },
    {
      name: 'description',
      label: 'Description',
      scope: 'local',
      options: {
        size: 260,
      },
      dataType: 'string',
      inputType: 'editor',
      validation: (z) => z.string().min(1, { error: 'Description is required' }),
      defaultValue: '',
    },
    {
      name: 'bottomDescription',
      label: 'Bottom Description',
      scope: 'local',
      options: {
        size: 260,
      },
      dataType: 'string',
      inputType: 'editor',
      validation: (z) => z.string().min(1, { error: 'Bottom Description is required' }),
      defaultValue: '',
    },
    {
      name: 'metaTitle',
      label: 'Meta Title',
      scope: 'local',
      options: {
        size: 260,
        comment: 'The meta-title of the brand',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().optional(),
      defaultValue: '',
    },
    {
      name: 'metaDescription',
      label: 'Meta Description',
      scope: 'local',
      options: {
        size: 260,
        comment: 'SEO meta description',
      },
      dataType: 'string',
      inputType: 'textarea',
      defaultValue: '',
    },
    {
      name: 'products',
      label: 'Products',
      scope: 'relationship',
      options: {
        size: 260,
        comment: 'Products of this brand',
      },
      dataType: 'string',
      inputType: 'relationship',
      defaultValue: '',
      relationship: {
        mode: 'multiple',
        field: 'name',
        entity: 'product',
      },
    },
  ],
});
