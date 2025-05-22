import { Globe as GlobeIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const countries = defineEntity({
  name: 'country',
  plural: 'countries',
  menu: {
    label: 'Countries',
    group: 'config',
    icon: <GlobeIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'global',
      options: {
        size: 150,
        comment: 'Name of the country (i.e. Spain, France, etc)',
      },
      dataType: 'string',
      isSearchable: true,
      isPrimary: true,
      isUnique: true,
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'Channel name is required' }),
      defaultValue: '',
    },
    {
      name: 'code',
      label: 'Code',
      scope: 'global',
      options: {
        size: 120,
        comment: 'ISO 3166-1 alpha-2 code of the country (i.e. ES, FR, etc)',
      },
      dataType: 'string',
      isUnique: true,
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'Country code is required' }),
      defaultValue: '',
    },
    {
      name: 'continent',
      label: 'Continent',
      scope: 'global',
      options: {
        size: 120,
        comment: 'Continent of the country (i.e. Europe, Africa, etc)',
        list: [
          { label: 'Europe', value: 'eu' },
          { label: 'Africa', value: 'af' },
          { label: 'Asia', value: 'as' },
          { label: 'North America', value: 'na' },
          { label: 'South America', value: 'sa' },
          { label: 'Oceania', value: 'oc' },
        ],
      },
      dataType: 'string',
      inputType: 'select',
      validation: (z) => z.string().min(1, { message: 'Continent is required' }),
      defaultValue: '',
    },
    {
      name: 'languageCode',
      label: 'Language Code',
      scope: 'global',
      options: {
        size: 140,
        comment: 'Language code of the country (i.e. es, fr, etc)',
      },
      dataType: 'string',
      inputType: 'text',
      defaultValue: '',
    },
  ],
});
