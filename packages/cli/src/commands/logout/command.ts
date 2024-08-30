import type { Command } from '../help';

export const logoutCommand: Command = {
  name: 'logout',
  description: 'Logout the current authenticated user.',
  arguments: [],
  options: [],
  examples: [
    {
      name: 'Logout from the CLI',
      value: `flexkit logout`,
    },
  ],
};
