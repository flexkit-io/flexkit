import type { Command, CommandOption } from '../help';

function option(
  name: string,
  type: CommandOption['type'],
  description: string,
  argument?: string,
  shorthand: string | null = null
): CommandOption {
  return { name, shorthand, type, argument, description, deprecated: false };
}

const jsonOption = option('json', Boolean, 'Print the API response as JSON on stdout');
const projectOption = option('project', String, 'Project to use (default: linked project)', 'ID', 'p');
const yesOption = option('yes', Boolean, 'Skip the confirmation prompt', undefined, 'y');

export const tokensListCommand: Command = {
  name: 'ls',
  description:
    'List the project API tokens: name, role, spaces, the last characters of the token, who created it and when. The secrets are never shown again.',
  arguments: [],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List tokens', value: 'flexkit tokens ls' },
    {
      name: 'Names and roles as JSON',
      value: 'flexkit tokens ls --json | jq -r \'.tokens[] | "\\(.name) \\(.role)"\'',
    },
    { name: 'Tokens of another project', value: 'flexkit tokens ls --project abcdefghij' },
  ],
};

export const tokensCreateCommand: Command = {
  name: 'create',
  description:
    'Create a project API token and print it once. The token goes to stdout and the notes to stderr, so `$(flexkit tokens create …)` captures only the token. You cannot give a token a higher role than yours, nor spaces you are not in.',
  arguments: [{ name: 'name', required: true }],
  options: [
    option('role', String, 'Token role: viewer, editor, contributor or developer (default: viewer)', 'ROLE', 'r'),
    option(
      'space',
      [String],
      'Space code or id the token may read, repeatable or comma separated (default: unrestricted data only)',
      'SPACE',
      's'
    ),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Create a read-only token', value: 'flexkit tokens create "Storefront"' },
    {
      name: 'A developer token for CI',
      value: 'flexkit tokens create "GitHub Actions" --role developer',
    },
    {
      name: 'An editor token that also reads two spaces',
      value: 'flexkit tokens create "Sales sync" --role editor --space sales --space marketing',
    },
    {
      name: 'Store the token as a GitHub secret',
      value: 'flexkit tokens create "GitHub Actions" --role developer | gh secret set FLEXKIT_TOKEN',
    },
    {
      name: 'Read the token from JSON in a script',
      value: "flexkit tokens create nightly-export --json | jq -r '.token.value'",
    },
  ],
};

export const tokensRemoveCommand: Command = {
  name: 'rm',
  description: 'Revoke a project API token by its id or exact name. Apps and scripts that use it stop working at once.',
  arguments: [{ name: 'idOrName', required: true }],
  options: [yesOption, jsonOption, projectOption],
  examples: [
    { name: 'Revoke a token by name', value: 'flexkit tokens rm "Storefront"' },
    { name: 'Revoke by id without a prompt', value: 'flexkit tokens rm 42 --yes' },
  ],
};

export const tokensCommand: Command = {
  name: 'tokens',
  description:
    "Manage the project's API tokens, which authenticate apps, scripts and CI (FLEXKIT_TOKEN). Needs a signed-in Owner or Developer: API tokens cannot manage tokens.",
  arguments: [],
  subcommands: [tokensListCommand, tokensCreateCommand, tokensRemoveCommand],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List tokens', value: 'flexkit tokens ls' },
    { name: 'Create a developer token for CI', value: 'flexkit tokens create "GitHub Actions" --role developer' },
    { name: 'Revoke a token', value: 'flexkit tokens rm "GitHub Actions"' },
  ],
};
