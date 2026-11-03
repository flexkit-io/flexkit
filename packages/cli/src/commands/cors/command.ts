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

export const corsListCommand: Command = {
  name: 'ls',
  description: 'List the browser origins allowed to call the project API.',
  arguments: [],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List origins', value: 'flexkit cors ls' },
    { name: 'Origins only, one per line', value: "flexkit cors ls --json | jq -r '.origins[].origin'" },
  ],
};

export const corsAddCommand: Command = {
  name: 'add',
  description:
    'Allow one or more browser origins (scheme, host and port, e.g. https://app.example.com). `*` may stand for one hostname label or the port. Origins already in the list are skipped, so the command is safe to rerun.',
  arguments: [{ name: 'origin...', required: true }],
  options: [
    option(
      'credentials',
      Boolean,
      'Mark the origins as sending credentials (cookies). Any such origin makes the API allow credentials for every listed origin'
    ),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Allow local development', value: 'flexkit cors add http://localhost:3000' },
    {
      name: 'Allow production and every preview subdomain',
      value: "flexkit cors add https://studio.example.com 'https://*.preview.example.com'",
    },
  ],
};

export const corsRemoveCommand: Command = {
  name: 'rm',
  description: 'Remove origins by origin or by id. Browsers may keep using a cached preflight for up to two hours.',
  arguments: [{ name: 'origin|id...', required: true }],
  options: [yesOption, jsonOption, projectOption],
  examples: [
    { name: 'Remove an origin', value: 'flexkit cors rm http://localhost:3000' },
    { name: 'Remove by id without a prompt', value: 'flexkit cors rm 42 43 --yes' },
  ],
};

export const corsCommand: Command = {
  name: 'cors',
  description:
    'Manage the CORS allowlist: the browser origins that may call the project API (for example a hosted Studio).',
  arguments: [],
  subcommands: [corsListCommand, corsAddCommand, corsRemoveCommand],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List origins', value: 'flexkit cors ls' },
    { name: 'Allow an origin', value: 'flexkit cors add https://studio.example.com' },
    { name: 'Remove an origin', value: 'flexkit cors rm https://old.example.com --yes' },
  ],
};
