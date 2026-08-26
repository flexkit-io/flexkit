import { Banknote } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const crmCurrencies = defineEntity({
  name: 'currency',
  plural: 'currencies',
  display: 'code',
  menu: {
    label: 'Currencies',
    group: 'config',
    icon: <Banknote />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Currency Name',
      scope: 'global',
      options: {
        size: 200,
        comment: 'Full name of the currency',
      },
      dataType: 'string',
      inputType: 'text',
      searchable: true,
      validation: (z) => z.string().min(1, { error: 'Currency name is required' }),
      defaultValue: '',
    },
    {
      name: 'code',
      label: 'Currency Code',
      scope: 'global',
      options: {
        size: 120,
        comment: 'ISO currency code (e.g., USD, EUR)',
      },
      dataType: 'string',
      inputType: 'text',
      searchable: true,
      validation: (z) => z.string().min(3, { error: 'Currency code is required' }),
      defaultValue: '',
    },
    {
      name: 'symbol',
      label: 'Symbol',
      scope: 'global',
      options: {
        size: 100,
        comment: 'Currency symbol (e.g., $, €)',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { error: 'Symbol is required' }),
      defaultValue: '',
    },
    {
      name: 'isDefault',
      label: 'Default Currency',
      scope: 'global',
      options: {
        size: 120,
        comment: 'Whether this is the default currency',
      },
      dataType: 'boolean',
      inputType: 'switch',
      defaultValue: '',
    },
    {
      name: 'isActive',
      label: 'Active',
      scope: 'global',
      options: {
        size: 120,
        comment: 'Whether this currency is active',
      },
      dataType: 'boolean',
      inputType: 'switch',
      defaultValue: '',
    },
    {
      name: 'exchangeRate',
      label: 'Exchange Rate to Default',
      scope: 'local',
      options: {
        size: 160,
        comment: 'Exchange rate relative to the default currency',
      },
      dataType: 'float',
      inputType: 'number',
      defaultValue: '',
    },
  ],
});
