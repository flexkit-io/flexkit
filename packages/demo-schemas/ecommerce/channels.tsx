import { TrafficCone as TrafficConeIcon } from 'lucide-react';
import { defineEntity } from '@flexkit/studio';

export const channels = defineEntity({
  name: 'channel',
  plural: 'channels',
  menu: {
    label: 'Channels',
    group: 'config',
    icon: <TrafficConeIcon />,
  },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'global',
      options: {
        size: 130,
        comment: 'Name of the channel (i.e. Spain, United States, Germany)',
      },
      dataType: 'string',
      isSearchable: true,
      isUnique: true,
      inputType: 'text',
      validation: (z) => z.string().min(1, { error: 'Channel name is required' }),
      defaultValue: '',
    },
  ],
});
