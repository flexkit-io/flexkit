import { TagsIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const promoTags = defineEntity({
  name: 'promoTag',
  plural: 'promoTags',
  menu: {
    label: 'Promo Tags',
    group: 'catalog',
    icon: <TagsIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'local',
      options: {
        size: 500,
        comment: 'A promotional tag of a product (i.e. black-friday)',
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
        comment: 'Products related to this promo tag',
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
