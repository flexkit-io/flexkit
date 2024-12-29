import { Store as StoreIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const brands = defineEntity({
  name: 'brand',
  plural: 'brands',
  menu: {
    label: 'Brands',
    group: 'catalog',
    icon: <StoreIcon />,
  },
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
      isPrimary: true,
      isUnique: true,
      isSearchable: true,
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'path',
      label: 'Path',
      scope: 'global',
      options: {
        size: 260,
        comment: 'URL path',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'Path is required' }),
      defaultValue: '',
    },
    {
      name: 'pathSegment',
      label: 'Path Segment',
      scope: 'global',
      options: {
        size: 260,
        comment: 'URL path segment',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string(),
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
