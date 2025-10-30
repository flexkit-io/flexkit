import type { Command } from '../help';

export const whoamiCommand: Command = {
  name: 'whoami',
  description: 'Shows the username or email of the currently logged-in user.',
  arguments: [],
  options: [],
  examples: [
    {
      name: 'Print current user name or email',
      value: 'flexkit whoami',
    },
  ],
};
