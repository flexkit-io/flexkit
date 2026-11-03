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

const editOptions = (create: boolean): CommandOption[] => [
  option(
    'url',
    String,
    create ? 'The http(s) address that receives the events (required)' : 'New receiver address',
    'URL'
  ),
  option('name', String, create ? 'Webhook name (default: the URL host)' : 'New name', 'NAME'),
  option('description', String, 'What the webhook is for', 'TEXT'),
  option(
    'entity',
    [String],
    create
      ? 'Only changes to this entity, repeatable or comma separated (default: every entity)'
      : 'Only changes to these entities; replaces the current list (repeatable)',
    'NAME'
  ),
  option(
    'on',
    [String],
    create
      ? 'Events that trigger it: create, update, delete or all, repeatable (default: all)'
      : 'Events that trigger it; replaces the current events (repeatable)',
    'EVENT'
  ),
  option(
    'header',
    [String],
    create
      ? 'Header sent with every delivery, as Key=Value (repeatable)'
      : 'Add or replace a header, as Key=Value; Key= removes it (repeatable)',
    'KEY=VALUE'
  ),
  option('method', String, 'HTTP method: POST (default), PUT, PATCH, GET or DELETE', 'METHOD'),
  option('secret', String, 'A shared secret stored with the webhook ("" clears it)', 'SECRET'),
];

export const webhooksListCommand: Command = {
  name: 'ls',
  description: 'List the outgoing webhooks of the project, with their status, events, entities and deliveries.',
  arguments: [],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List webhooks', value: 'flexkit webhooks ls' },
    {
      name: 'Names of the disabled webhooks',
      value: "flexkit webhooks ls --json | jq -r '.webhooks[] | select(.enabled | not) | .name'",
    },
  ],
};

export const webhooksInspectCommand: Command = {
  name: 'inspect',
  description:
    'Show a webhook: receiver, events, entities, headers and delivery counts. Accepts the webhook id or its exact name. Header values and the secret are hidden unless you pass --show-secrets (owners and developers only).',
  arguments: [{ name: 'idOrName', required: true }],
  options: [option('show-secrets', Boolean, 'Print header values and the secret'), jsonOption, projectOption],
  examples: [
    { name: 'Show a webhook by name', value: 'flexkit webhooks inspect "Orders to ERP"' },
    {
      name: 'Include header values',
      value: 'flexkit webhooks inspect 3f9c2a1e-8d4b-4c7a-9e2f-5b6a7c8d9e0f --show-secrets',
    },
    { name: 'Read one field', value: "flexkit webhooks inspect erp.example.com --json | jq '.webhook.deliveries'" },
  ],
};

export const webhooksCreateCommand: Command = {
  name: 'create',
  description:
    'Create an outgoing webhook that calls a URL when records change. By default it fires on every event of every entity and is enabled.',
  arguments: [],
  options: [
    ...editOptions(true),
    option('disabled', Boolean, 'Create it disabled; turn it on later with `flexkit webhooks enable`'),
    jsonOption,
    projectOption,
  ],
  examples: [
    {
      name: 'Notify a receiver about new and changed orders',
      value:
        'flexkit webhooks create --name "Orders to ERP" --url https://erp.example.com/hooks/flexkit --entity Order --on create --on update',
    },
    {
      name: 'Authenticate to the receiver with a header',
      value:
        'flexkit webhooks create --url https://hooks.example.com/flexkit --header "Authorization=Bearer $RECEIVER_TOKEN"',
    },
    {
      name: 'Create it disabled and print its id',
      value: "flexkit webhooks create --url https://staging.example.com/hook --disabled --json | jq -r '.webhook.id'",
    },
  ],
};

export const webhooksUpdateCommand: Command = {
  name: 'update',
  description:
    'Change a webhook. Fields you do not pass keep their value. --entity and --on replace the current lists; --header adds or replaces single headers.',
  arguments: [{ name: 'idOrName', required: true }],
  options: [
    ...editOptions(false),
    option('remove-header', [String], 'Stop sending this header (repeatable)', 'KEY'),
    option('all-entities', Boolean, 'Fire for every entity again (clears the --entity filter)'),
    jsonOption,
    projectOption,
  ],
  examples: [
    {
      name: 'Point a webhook at a new URL',
      value: 'flexkit webhooks update "Orders to ERP" --url https://erp.example.com/v2/hooks/flexkit',
    },
    {
      name: 'Rotate the receiver token',
      value: 'flexkit webhooks update "Orders to ERP" --header "Authorization=Bearer $NEW_RECEIVER_TOKEN"',
    },
    {
      name: 'Fire on deletes of every entity only',
      value: 'flexkit webhooks update 3f9c2a1e-8d4b-4c7a-9e2f-5b6a7c8d9e0f --on delete --all-entities',
    },
  ],
};

export const webhooksEnableCommand: Command = {
  name: 'enable',
  description: 'Turn one or more webhooks on.',
  arguments: [{ name: 'idOrName...', required: true }],
  options: [jsonOption, projectOption],
  examples: [{ name: 'Enable a webhook', value: 'flexkit webhooks enable "Orders to ERP"' }],
};

export const webhooksDisableCommand: Command = {
  name: 'disable',
  description: 'Turn one or more webhooks off without deleting them. Changes made while off are not delivered later.',
  arguments: [{ name: 'idOrName...', required: true }],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Pause a webhook during receiver maintenance', value: 'flexkit webhooks disable "Orders to ERP"' },
  ],
};

export const webhooksRemoveCommand: Command = {
  name: 'rm',
  description: 'Delete one or more webhooks. Asks first; pass --yes in scripts.',
  arguments: [{ name: 'idOrName...', required: true }],
  options: [yesOption, jsonOption, projectOption],
  examples: [
    { name: 'Delete a webhook', value: 'flexkit webhooks rm "Orders to ERP"' },
    { name: 'Delete without a prompt', value: 'flexkit webhooks rm 3f9c2a1e-8d4b-4c7a-9e2f-5b6a7c8d9e0f --yes' },
  ],
};

export const webhooksCommand: Command = {
  name: 'webhooks',
  description:
    'Manage outgoing webhooks: HTTP calls Flexkit makes to your URL when records are created, updated or deleted.',
  arguments: [],
  subcommands: [
    webhooksListCommand,
    webhooksInspectCommand,
    webhooksCreateCommand,
    webhooksUpdateCommand,
    webhooksEnableCommand,
    webhooksDisableCommand,
    webhooksRemoveCommand,
  ],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List webhooks', value: 'flexkit webhooks ls' },
    {
      name: 'Create a webhook for order changes',
      value: 'flexkit webhooks create --url https://erp.example.com/hooks/flexkit --entity Order',
    },
    { name: 'Pause a webhook', value: 'flexkit webhooks disable "Orders to ERP"' },
  ],
};
