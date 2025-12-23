import { Tag } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const crmTags = defineEntity({
  name: 'tag',
  plural: 'tags',
  menu: {
    label: 'Tags',
    group: 'config',
    icon: <Tag />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Tag Name',
      scope: 'global',
      options: {
        size: 200,
        comment: 'Name of the tag',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Tag name is required' }),
      defaultValue: '',
    },
    {
      name: 'description',
      label: 'Description',
      scope: 'global',
      options: {
        size: 260,
        comment: 'Description of what this tag represents',
      },
      dataType: 'string',
      inputType: 'textarea',
      defaultValue: '',
    },
    {
      name: 'category',
      label: 'Category',
      scope: 'global',
      options: {
        list: [
          { label: 'Deal Type', value: 'dealType' },
          { label: 'Industry', value: 'industry' },
          { label: 'Priority', value: 'priority' },
          { label: 'Process', value: 'process' },
          { label: 'Marketing', value: 'marketing' },
          { label: 'Product', value: 'product' },
          { label: 'Other', value: 'other' },
        ],
        size: 180,
        comment: 'Category this tag belongs to',
      },
      dataType: 'string',
      inputType: 'select',
      defaultValue: 'other',
    },
  ],
});
