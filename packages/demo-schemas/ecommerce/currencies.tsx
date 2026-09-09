import { Euro as EuroIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const currencies = defineEntity({
  name: 'currency',
  plural: 'currencies',
  display: 'name',
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
      searchable: true,
      validation: (z) => z.string().min(1, { error: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'code',
      label: 'Code',
      scope: 'global',
      options: {
        size: 110,
        comment: 'The ISO 4217 alpha-3 code of the currency',
      },
      dataType: 'string',
      inputType: 'text',
      unique: true,
      searchable: true,
      validation: (z) => z.string().min(1, { error: 'Code is required' }),
      defaultValue: '',
    },
    {
      name: 'symbol',
      label: 'Symbol',
      scope: 'global',
      options: {
        size: 120,
        comment: 'The symbol of the currency',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { error: 'Symbol is required' }),
      defaultValue: '',
    },
  ],
});
