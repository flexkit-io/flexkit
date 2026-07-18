import { FolderTreeIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const uses = defineEntity({
  name: 'use',
  plural: 'uses',
  menu: {
    label: 'Uses',
    group: 'catalog',
    icon: <FolderTreeIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'local',
      options: {
        size: 200,
        comment: 'A category of products (i.e. Moisturizing, Cooling, Energizing, etc.)',
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
        comment: 'Products related to this flavour',
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
