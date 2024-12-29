import { Flag as FlagIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const flags = defineEntity({
  name: 'flag',
  plural: 'flags',
  menu: {
    label: 'Flags',
    group: 'catalog',
    icon: <FlagIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'local',
      options: {
        size: 200,
        comment: 'A characteristic or benefit of a product',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'tooltip',
      label: 'Tooltip',
      scope: 'local',
      options: {
        size: 450,
        comment: 'The tooltip text to display when hovering over the flag',
      },
      dataType: 'string',
      inputType: 'textarea',
      validation: (z) => z.string().min(1, { message: 'Tooltip is required' }),
      defaultValue: '',
    },
    {
      name: 'products',
      label: 'Products',
      scope: 'relationship',
      options: {
        size: 260,
        comment: 'Products related to this flag',
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
    {
      name: 'image',
      label: 'Image',
      options: {
        accept: 'image/svg+xml',
        size: 160,
        comment: 'An SVG image representing the flag',
      },
      dataType: 'image',
      inputType: 'image',
      scope: 'global',
      defaultValue: '',
    },
  ],
});
