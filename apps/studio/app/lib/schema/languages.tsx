import { BookType as BookTypeIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio/ssr';

export const languages = defineEntity({
  name: 'language',
  plural: 'languages',
  menu: {
    label: 'Languages',
    group: 'config',
    icon: <BookTypeIcon />,
  },
  attributes: [
    {
      name: 'code',
      label: 'Code',
      scope: 'global',
      options: {
        size: 75,
        comment: 'The ISO 639-1 code of the language (e.g. en, de, fr, etc.)',
      },
      dataType: 'string',
      inputType: 'text',
      validation: (z) => z.string().min(1, { message: 'Code is required' }),
      defaultValue: '',
    },
    {
      name: 'name',
      label: 'Name',
      scope: 'global',
      options: {
        size: 200,
        comment: 'The name of the language',
      },
      dataType: 'string',
      inputType: 'text',
      isSearchable: true,
      isPrimary: true,
      validation: (z) => z.string().min(1, { message: 'Name is required' }),
      defaultValue: '',
    },
  ],
});
