import type { Entity } from '../core/types';

export const tagSchema: Entity = {
  name: '_tag',
  plural: '_tags',
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
      isEditable: true,
      dataType: 'string',
      inputType: 'text',
      previewType: 'text',
      isPrimary: true,
      defaultValue: '',
    },
    {
      name: '_updatedAt',
      label: 'Last Updated',
      scope: 'global',
      options: {
        size: 140,
      },
      isEditable: true,
      dataType: 'string',
      inputType: 'text',
      previewType: 'text',
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
