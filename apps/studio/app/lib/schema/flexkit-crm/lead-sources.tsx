import { Share2 } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const leadSources = defineEntity({
  name: 'leadSource',
  plural: 'leadSources',
  menu: {
    label: 'Lead Sources',
    group: 'marketing',
    icon: <Share2 />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Source Name',
      scope: 'local',
      options: {
        size: 200,
        comment: 'Name of the lead source',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Source name is required' }),
      defaultValue: '',
    },
    {
      name: 'category',
      label: 'Category',
      scope: 'global',
      options: {
        list: [
          { label: 'Website', value: 'website' },
          { label: 'Social Media', value: 'social' },
          { label: 'Referral', value: 'referral' },
          { label: 'Event', value: 'event' },
          { label: 'Advertisement', value: 'advertisement' },
          { label: 'Other', value: 'other' },
        ],
        size: 180,
        comment: 'Category of the lead source',
      },
      dataType: 'string',
      inputType: 'select',
      defaultValue: '',
    },
    {
      name: 'description',
      label: 'Description',
      scope: 'local',
      options: {
        size: 260,
        comment: 'Description of the lead source',
      },
      dataType: 'string',
      inputType: 'textarea',
      defaultValue: '',
    },
    {
      name: 'isActive',
      label: 'Active',
      scope: 'global',
      options: {
        size: 120,
        comment: 'Whether this lead source is active',
      },
      dataType: 'boolean',
      inputType: 'switch',
      defaultValue: '',
    },
  ],
});
