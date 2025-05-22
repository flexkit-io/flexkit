import { BadgePercent as BadgePercentIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const taxes = defineEntity({
  name: 'tax',
  plural: 'taxes',
  menu: {
    label: 'Taxes',
    group: 'finance',
    icon: <BadgePercentIcon />,
  },
  attributes: [
    {
      name: 'adminRef',
      label: 'Admin Ref',
      scope: 'global',
      options: {
        size: 250,
        comment: 'A reference number used to identify the tax',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Admin Ref is required' }),
      defaultValue: '',
    },
    {
      name: 'rate',
      label: 'Rate',
      scope: 'global',
      options: {
        size: 150,
        comment: 'The rate of the tax',
      },
      dataType: 'float',
      inputType: 'number',
      previewType: 'taxRatePreviewField',
      validation: (z) =>
        z.number().min(0, { message: 'Rate is required' }).max(1, { message: 'Rate must be less than 1' }),
      defaultValue: '0',
    },
    {
      name: 'country',
      label: 'Country',
      scope: 'relationship',
      dataType: 'string',
      inputType: 'relationship',
      relationship: {
        entity: 'country',
        field: 'name',
        mode: 'single',
      },
    },
  ],
});
