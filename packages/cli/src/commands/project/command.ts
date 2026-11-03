import type { Command } from '../help';

export const projectListCommand: Command = {
  parent: 'project',
  name: 'ls',
  description: 'List projects, or get a single project by name or id.',
  arguments: [
    {
      name: 'nameOrId',
      required: false,
    },
  ],
  options: [
    {
      name: 'json',
      shorthand: null,
      type: String,
      description: 'Output response as JSON',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'List projects',
      value: 'flexkit project ls',
    },
    {
      name: 'List projects in a specific team scope',
      value: 'flexkit project ls --scope my-team',
    },
    {
      name: 'Get a single project by id or name',
      value: 'flexkit project ls my-project',
    },
  ],
};

export const projectAddCommand: Command = {
  parent: 'project',
  name: 'add',
  description: 'Create a project.',
  arguments: [
    {
      name: 'name',
      required: true,
    },
  ],
  options: [
    {
      name: 'json',
      shorthand: null,
      type: String,
      description: 'Output response as JSON',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Create a project',
      value: 'flexkit project add my-project',
    },
    {
      name: 'Create a project in a specific team scope',
      value: 'flexkit project add my-project --scope team-id-or-name',
    },
  ],
};

export const projectRemoveCommand: Command = {
  parent: 'project',
  name: 'rm',
  description: 'Remove a project by id or name.',
  arguments: [
    {
      name: 'nameOrId',
      required: true,
    },
  ],
  options: [
    {
      name: 'json',
      shorthand: null,
      type: String,
      description: 'Output response as JSON',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Remove a project',
      value: 'flexkit project rm my-project',
    },
    {
      name: 'Remove a project from a specific team scope',
      value: 'flexkit project rm my-project --scope team-id-or-name',
    },
  ],
};

const pauseOptions: Command['options'] = [
  {
    name: 'project',
    shorthand: 'p',
    type: String,
    argument: 'ID',
    description: 'Project to use (default: linked project)',
    deprecated: false,
  },
  {
    name: 'json',
    shorthand: null,
    type: Boolean,
    description: 'Print the API response as JSON on stdout',
    deprecated: false,
  },
];

export const projectPauseCommand: Command = {
  parent: 'project',
  name: 'pause',
  description:
    "Pause the project (Pro plans): GraphQL, automations and agent chat stop until an owner unpauses it. Asks you to type the project's name, as the dashboard does. Owners only, signed in with `flexkit login`; API tokens can't pause a project.",
  arguments: [],
  options: [
    ...pauseOptions,
    {
      name: 'yes',
      shorthand: 'y',
      type: Boolean,
      description: 'Skip typing the project name (needed without a terminal)',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Pause the linked project',
      value: 'flexkit project pause',
    },
    {
      name: 'Pause another project from a script',
      value: 'flexkit project pause --project 3pbqd8xkz1 --yes',
    },
  ],
};

export const projectUnpauseCommand: Command = {
  parent: 'project',
  name: 'unpause',
  description:
    'Bring a paused project back online. A pause from on-demand usage limits or an overdue invoice is lifted in Billing instead. Owners only, signed in with `flexkit login`.',
  arguments: [],
  options: pauseOptions,
  examples: [
    {
      name: 'Unpause the linked project',
      value: 'flexkit project unpause',
    },
    {
      name: 'Unpause another project',
      value: 'flexkit project unpause --project 3pbqd8xkz1',
    },
  ],
};

export const projectCommand: Command = {
  name: 'project',
  description: 'Manage projects.',
  arguments: [],
  subcommands: [
    projectListCommand,
    projectAddCommand,
    projectRemoveCommand,
    projectPauseCommand,
    projectUnpauseCommand,
  ],
  options: [
    {
      name: 'json',
      shorthand: null,
      type: String,
      description: 'Output response as JSON',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'List projects',
      value: 'flexkit project ls',
    },
    {
      name: 'Create a new project',
      value: 'flexkit project add my-project',
    },
    {
      name: 'Remove a project',
      value: 'flexkit project rm my-project-id',
    },
    {
      name: 'Pause the linked project',
      value: 'flexkit project pause',
    },
  ],
};
