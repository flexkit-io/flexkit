import type { Command } from '../help';

export const syncCommand: Command = {
  name: 'sync',
  description: 'Synchronize the current schema with the backend to ensure your data structure is up-to-date',
  arguments: [],
  options: [],
  examples: [
    {
      name: 'Sync the data schema',
      value: `flexkit sync`,
    },
  ],
};
