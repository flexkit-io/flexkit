import type { Command } from '../help';

export const toolsSyncCommand: Command = {
  name: 'sync',
  description: 'Re-read the production tool catalog from the project tools URL and sync its code skills.',
  arguments: [],
  options: [
    {
      name: 'project',
      shorthand: null,
      type: String,
      argument: 'ID',
      description: 'Project to sync when flexkit.config.ts defines several',
      deprecated: false,
    },
    {
      name: 'origin',
      shorthand: null,
      type: String,
      argument: 'URL',
      description: 'Store this HTTPS URL as the production tools URL before syncing',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Re-read the catalog from the stored tools URL after a deploy',
      value: 'flexkit tools sync',
    },
    {
      name: 'Register the endpoint for the first time',
      value: 'flexkit tools sync --origin https://app.example.com/api/flexkit/tools',
    },
  ],
};

export const toolsCommand: Command = {
  name: 'tools',
  description: 'Manage the production custom-tools catalog of a project.',
  arguments: [],
  subcommands: [toolsSyncCommand],
  options: [],
  examples: [
    {
      name: 'Sync the production catalog',
      value: 'flexkit tools sync',
    },
  ],
};
