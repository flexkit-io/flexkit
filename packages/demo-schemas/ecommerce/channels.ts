import { defineEntity } from '@flexkit/schema';

export const channels = defineEntity({
  name: 'channel',
  plural: 'channels',
  menu: {
    label: 'Channels',
    group: 'config',
    icon: 'TrafficCone',
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'global',
      options: {
        size: 250,
        comment: 'Name of the channel (i.e. Spain, United States, Germany)',
      },
      dataType: 'string',
      searchable: true,
      unique: true,
      inputType: 'text',
      validation: (z) => z.string().min(1, { error: 'Channel name is required' }),
      defaultValue: '',
    },
    {
      name: 'externalId',
      label: 'External ID',
      scope: 'global',
      options: {
        size: 280,
      },
      dataType: 'string',
      searchable: true,
      unique: true,
      inputType: 'text',
      defaultValue: '',
    },
  ],
});
