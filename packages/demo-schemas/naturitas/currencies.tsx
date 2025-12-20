import { Euro as EuroIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const currencies = defineEntity({
  name: 'currency',
  plural: 'currencies',
  menu: {
    label: 'Currencies',
    group: 'config',
    icon: <EuroIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'global',
      options: {
        size: 200,
        comment: 'The name of the currency',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'code',
      label: 'Code',
      scope: 'global',
      options: {
        size: 75,
        comment: 'The ISO 4217 alpha-3 code of the currency',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'Code is required' }),
      defaultValue: '',
    },
    {
      name: 'symbol',
      label: 'Symbol',
      scope: 'global',
      options: {
        size: 75,
        comment: 'The symbol of the currency',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'Symbol is required' }),
      defaultValue: '',
    },
    {
      name: 'rate',
      label: 'Rate',
      scope: 'global',
      options: {
        size: 150,
        comment: 'The exchange rate of the currency to the base currency (EUR)',
      },
      dataType: 'float',
      inputType: 'number',
      previewType: 'ratePreviewField',
      validation: (z) => z.number().min(0, { message: 'Rate is required' }),
      defaultValue: '0',
    },
  ],
});
