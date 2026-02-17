import type { Command } from '../help';

export const projectListCommand: Command = {
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

export const projectCommand: Command = {
  name: 'project',
  description: 'Manage projects.',
  arguments: [],
  subcommands: [projectListCommand, projectAddCommand, projectRemoveCommand],
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
  ],
};
