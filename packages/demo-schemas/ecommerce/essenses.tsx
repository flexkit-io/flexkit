import { FlaskConicalIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const essenses = defineEntity({
  name: 'essence',
  plural: 'essenses',
  display: 'name',
  menu: {
    label: 'Essenses',
    group: 'catalog',
    icon: <FlaskConicalIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'local',
      options: {
        size: 200,
        comment: 'An essence of a product (i.e. Citric, Mint, Coconut, etc.)',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      validation: (z) => z.string().min(1, { error: 'Name is required' }),
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
