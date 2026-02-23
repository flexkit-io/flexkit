import type { Command } from '../help';

export const deployCommand: Command = {
  name: 'deploy',
  description: 'Deploy the current schema and observe job progress in real time.',
  arguments: [],
  options: [],
  examples: [
    {
      name: 'Deploy the current project schema',
      value: 'flexkit deploy',
    },
  ],
};
