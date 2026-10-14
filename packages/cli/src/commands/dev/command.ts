import type { Command } from '../help';

export const devCommand: Command = {
  name: 'dev',
  description: 'Run the custom tools and code skills from flexkit.tools.ts as your local runtime.',
  arguments: [],
  options: [
    {
      name: 'project',
      shorthand: null,
      type: String,
      argument: 'ID',
      description: 'Project to connect when flexkit.config.ts defines several',
      deprecated: false,
    },
    {
      name: 'tools-file',
      shorthand: null,
      type: String,
      argument: 'FILE',
      description: 'Path to the tools file (default: flexkit.tools.ts in the current directory)',
      deprecated: false,
    },
    {
      name: 'env-file',
      shorthand: null,
      type: [String],
      argument: 'FILE',
      description: 'Environment file to load before importing the tools; repeatable (default: .env.local, .env)',
      deprecated: false,
    },
    {
      name: 'no-watch',
      shorthand: null,
      type: Boolean,
      description: 'Do not reload when the tools file changes',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Run the local runtime from the folder with flexkit.config.ts and flexkit.tools.ts',
      value: 'flexkit dev',
    },
    {
      name: 'Connect one project of a multi-project config with a specific env file',
      value: 'flexkit dev --project abcdefghij --env-file .env.development',
    },
  ],
};
