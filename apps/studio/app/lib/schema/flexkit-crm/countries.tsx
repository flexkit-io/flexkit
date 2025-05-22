import { Globe } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const crmCountries = defineEntity({
  name: 'country',
  plural: 'countries',
  menu: {
    label: 'Countries',
    group: 'config',
    icon: <Globe />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Country Name',
      scope: 'local',
      options: {
        size: 200,
        comment: 'Full name of the country',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Country name is required' }),
      defaultValue: '',
    },
    {
      name: 'code',
      label: 'Country Code',
      scope: 'global',
      options: {
        size: 140,
        comment: 'ISO 3166-1 alpha-2 country code (e.g., US, GB)',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      validation: (z) => z.string().length(2, { message: 'Country code must be exactly 2 characters' }),
      defaultValue: '',
    },
    {
      name: 'region',
      label: 'Region',
      scope: 'global',
      options: {
        list: [
          { label: 'North America', value: 'na' },
          { label: 'Europe', value: 'eu' },
          { label: 'Middle East & Africa', value: 'mea' },
          { label: 'Asia Pacific', value: 'apac' },
          { label: 'Latin America', value: 'latam' },
        ],
        size: 180,
        comment: 'Geographical region of the country',
      },
      dataType: 'string',
      inputType: 'select',
      defaultValue: '',
    },
    {
      name: 'phoneCode',
      label: 'Phone Code',
      scope: 'global',
      options: {
        size: 120,
        comment: 'International dialing code (e.g., +1, +44)',
      },
      dataType: 'string',
      inputType: 'text',
      defaultValue: '',
    },
    {
      name: 'currency',
      label: 'Default Currency',
      scope: 'relationship',
      options: {
        size: 160,
        comment: 'Default currency used in this country',
      },
      dataType: 'string',
      inputType: 'relationship',
      relationship: {
        mode: 'single',
        field: 'code',
        entity: 'currency',
      },
      defaultValue: '',
    },
    {
      name: 'isActive',
      label: 'Active',
      scope: 'global',
      options: {
        size: 120,
        comment: 'Whether this country is active in the system',
      },
      dataType: 'boolean',
      inputType: 'switch',
      defaultValue: '',
    },
  ],
});
