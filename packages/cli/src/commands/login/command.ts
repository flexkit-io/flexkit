import type { Command } from '../help';

export const loginCommand: Command = {
  name: 'login',
  description: 'Authenticate using your email or team id.',
  arguments: [
    {
      name: 'email or team id',
      required: false,
    },
  ],
  options: [
    {
      name: 'github',
      description: 'Log in with GitHub',
      shorthand: null,
      type: String,
      deprecated: false,
    },
    {
      name: 'oob',
      description: 'Log in with "out of band" authentication',
      shorthand: null,
      type: String,
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Log into the Vercel platform',
      value: `flexkit login`,
    },
    {
      name: 'Log in using a specific email address',
      value: `flexkit login username@example.com`,
    },
    {
      name: 'Log in using a specific team "slug" for SAML Single Sign-On',
      value: `flexkit login acme`,
    },
    {
      name: 'Log in using GitHub in "out-of-band" mode',
      value: `flexkit login --github --oob`,
    },
  ],
};
