import type { Command } from '../help';

export const deployCommand: Command = {
  name: 'deploy',
  description: 'Deploy the current schema and observe job progress in real time.',
  arguments: [],
  options: [
    {
      name: 'force',
      shorthand: null,
      type: String,
      description: 'Force deployment when the schema has not changed',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Deploy the current project schema',
      value: 'flexkit deploy',
    },
    {
      name: 'Force deployment when the schema has not changed',
      value: 'flexkit deploy --force',
    },
  ],
};
