import type { Entity } from '../core/types';

export const tagSchema: Entity = {
  name: '_tag',
  plural: '_tags',
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
  ],
};
