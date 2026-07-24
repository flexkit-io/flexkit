import { BoxIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const contentFormats = defineEntity({
  name: 'contentFormat',
  plural: 'contentFormats',
  menu: {
    label: 'Content Formats',
    group: 'catalog',
    icon: <BoxIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'local',
      options: {
        size: 500,
        comment: 'A content format (i.e. liquid, cream, gel, oil, etc.)',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'products',
      label: 'Products',
      scope: 'relationship',
      options: {
        size: 260,
        comment: 'Products related to this content format',
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
