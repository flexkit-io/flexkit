import { BarcodeIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const promoCodes = defineEntity({
  name: 'promoCode',
  plural: 'promoCodes',
  menu: {
    label: 'Promo Codes',
    group: 'catalog',
    icon: <BarcodeIcon />,
  },
  attributes: [
    {
      name: 'code',
      label: 'Code',
      scope: 'local',
      options: {
        size: 200,
        comment: 'A promotional code (i.e. black-friday-2026)',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Code is required' }),
      defaultValue: '',
    },
    {
      name: 'products',
      label: 'Products',
      scope: 'relationship',
      options: {
        size: 260,
        comment: 'Products related to this promo code',
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
