import type { Command } from '../help';

export const linkCommand: Command = {
  name: 'link',
  description:
    'Link the current folder to a Flexkit project. Commands run in this folder (or any folder below it) then act on that project without --project. The link is stored in .flexkit/project.json, which is added to .gitignore.',
  arguments: [
    {
      name: 'nameOrId',
      required: false,
    },
  ],
  options: [
    {
      name: 'scope',
      shorthand: 'S',
      type: String,
      argument: 'TEAM',
      description: 'Team to pick the project from (default: your current team)',
      deprecated: false,
    },
    {
      name: 'yes',
      shorthand: 'y',
      type: Boolean,
      description: 'Replace an existing link without asking',
      deprecated: false,
    },
    {
      name: 'json',
      shorthand: null,
      type: Boolean,
      description: 'Print the written link as JSON',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Pick a project from a list and link this folder to it',
      value: 'flexkit link',
    },
    {
      name: 'Link to a project by name or id',
      value: 'flexkit link my-shop',
    },
    {
      name: 'Link to a project of another team, replacing the current link',
      value: 'flexkit link my-shop --scope acme --yes',
    },
  ],
};

export const unlinkCommand: Command = {
  name: 'unlink',
  description: 'Remove the link between the current folder and its Flexkit project (.flexkit/project.json).',
  arguments: [],
  options: [
    {
      name: 'yes',
      shorthand: 'y',
      type: Boolean,
      description: 'Remove the link without asking',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Unlink the current folder',
      value: 'flexkit unlink',
    },
    {
      name: 'Unlink in a script without a prompt',
      value: 'flexkit unlink --yes',
    },
  ],
};
