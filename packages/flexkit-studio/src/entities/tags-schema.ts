import type { Entity } from '../core/types';

export const tagSchema: Entity = {
  name: '_tag',
  plural: '_tags',
  display: 'name',
  menu: {
    hidden: true,
  },
  attributes: [
    {
      name: 'name',
      label: 'Tag Name',
      scope: 'global',
      options: {
        size: 220,
      },
      dataType: 'string',
      inputType: 'text',
      previewType: 'text',
      defaultValue: '',
    },
    {
      name: '_updatedAt',
      label: 'Updated At',
      scope: 'global',
      options: {
        size: 220,
      },
      readOnly: true,
      hidden: true,
      dataType: 'datetime',
      inputType: 'datetime',
      previewType: 'datetime',
      defaultValue: '',
    },
    {
      name: 'assets',
      label: 'Assets',
      scope: 'relationship',
      dataType: 'string',
      inputType: 'relationship',
      defaultValue: '',
      relationship: {
        mode: 'multiple',
        field: 'originalFilename',
        entity: '_asset',
      },
    },
  ],
};
