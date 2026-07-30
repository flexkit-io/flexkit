import { FlaskConicalIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const flavours = defineEntity({
  name: 'flavour',
  plural: 'flavours',
  menu: {
    label: 'Flavours',
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
        comment: 'A flavour of a product (i.e. Strawberry, Chocolate, Vanilla, etc.)',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
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
