import type { Command, CommandOption } from '../help';

const projectOption: CommandOption = {
  name: 'project',
  shorthand: 'p',
  type: String,
  argument: 'ID',
  description: 'Project to use (default: linked project)',
  deprecated: false,
};

const jsonOption: CommandOption = {
  name: 'json',
  shorthand: null,
  type: Boolean,
  description: 'Print the API response as JSON on stdout',
  deprecated: false,
};

const connectionOption: CommandOption = {
  name: 'connection',
  shorthand: null,
  type: String,
  argument: 'ID',
  description: 'Connected account to use (default: your primary personal account, else the primary project account)',
  deprecated: false,
};

export const pluginsListCommand: Command = {
  name: 'ls',
  description:
    'List the plugins in use in the project (installed or with a connected account). Use --available for the catalog plugins you can add, or --all for both.',
  arguments: [],
  options: [
    {
      name: 'available',
      shorthand: null,
      type: Boolean,
      description: 'List catalog plugins that are not in use yet',
      deprecated: false,
    },
    {
      name: 'all',
      shorthand: null,
      type: Boolean,
      description: 'List every plugin in the catalog',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List the plugins in use', value: 'flexkit plugins ls' },
    { name: 'Browse the catalog', value: 'flexkit plugins ls --available' },
    {
      name: 'Print the ids of connected plugins',
      value: "flexkit plugins ls --json | jq -r '.[] | select(.connections | length > 0) | .id'",
    },
  ],
};

export const pluginsInspectCommand: Command = {
  name: 'inspect',
  description: 'Show a plugin: version, how it connects, its connected accounts, skills and MCP servers.',
  arguments: [{ name: 'pluginId', required: true }],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Show the Gmail plugin', value: 'flexkit plugins inspect gmail' },
    {
      name: 'Print the connected accounts as JSON',
      value: "flexkit plugins inspect slack --json | jq '.plugin.connections'",
    },
  ],
};

export const pluginsAddCommand: Command = {
  name: 'add',
  description:
    'Install a catalog plugin in the project, and enable it again if it was disabled. Requires the owner or developer role. Connect an account afterwards with `flexkit plugins connect`.',
  arguments: [{ name: 'pluginId', required: true }],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Install the Shopify plugin', value: 'flexkit plugins add shopify' },
    { name: 'Install it in another project', value: 'flexkit plugins add google-calendar --project abcdefghij' },
  ],
};

export const pluginsRemoveCommand: Command = {
  name: 'rm',
  description:
    'Disable a plugin in the project: the agent, automations and MCP clients stop using it. Connected accounts are kept, so `flexkit plugins add` turns it back on; remove them with `flexkit plugins disconnect`. Requires the owner or developer role.',
  arguments: [{ name: 'pluginId', required: true }],
  options: [
    {
      name: 'yes',
      shorthand: 'y',
      type: Boolean,
      description: 'Skip the confirmation prompt',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Disable the Slack plugin', value: 'flexkit plugins rm slack' },
    { name: 'Disable without a prompt (scripts)', value: 'flexkit plugins rm slack --yes' },
  ],
};

export const pluginsConnectCommand: Command = {
  name: 'connect',
  description:
    "Connect an account to a plugin. Sign-in plugins open the plugin's page in Studio, where you choose Connect, and the CLI waits until the account appears. Token and credentials plugins are connected right here: pass the values with --api-token or --set, or answer the prompts. Connecting installs the plugin when needed.",
  arguments: [{ name: 'pluginId', required: true }],
  options: [
    {
      name: 'scope',
      shorthand: null,
      type: String,
      argument: 'project|personal',
      description:
        'Connect a shared project account or your personal one (default: project when your role allows it, else personal)',
      deprecated: false,
    },
    {
      name: 'api-token',
      shorthand: null,
      type: String,
      argument: 'VALUE|@FILE|-',
      description: 'Token for token plugins: inline, @file, or - to read stdin (default: prompt)',
      deprecated: false,
    },
    {
      name: 'method',
      shorthand: null,
      type: String,
      argument: 'KEY',
      description: 'Credentials method when the plugin offers several (default: prompt, or the first one)',
      deprecated: false,
    },
    {
      name: 'set',
      shorthand: null,
      type: [String],
      argument: 'KEY=VALUE',
      description: 'Credential field value (repeatable); missing fields are prompted for',
      deprecated: false,
    },
    {
      name: 'reconnect',
      shorthand: null,
      type: String,
      argument: 'CONNECTION_ID',
      description: 'Replace the token or credentials of this account instead of adding one',
      deprecated: false,
    },
    {
      name: 'no-browser',
      shorthand: null,
      type: Boolean,
      description: 'Print the Studio link for sign-in plugins instead of opening a browser',
      deprecated: false,
    },
    {
      name: 'no-wait',
      shorthand: null,
      type: Boolean,
      description: 'Do not wait for a sign-in to finish',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Connect your Gmail account (opens Studio)', value: 'flexkit plugins connect gmail --scope personal' },
    {
      name: 'Connect a Shopify store with a Dev Dashboard app',
      value:
        'flexkit plugins connect shopify --method client --set shop=acme.myshopify.com --set clientId=4f1c0d7e9a2b --set clientSecret=@secret.txt',
    },
    {
      name: 'Connect a token plugin from an environment variable',
      value: 'echo "$TINYBIRD_TOKEN" | flexkit plugins connect tinybird --api-token -',
    },
  ],
};

export const pluginsDisconnectCommand: Command = {
  name: 'disconnect',
  description:
    'Disconnect an account from a plugin and revoke its stored credentials. Pass the plugin id (with --connection when it has several accounts) or the connection id itself.',
  arguments: [{ name: 'pluginId|connectionId', required: true }],
  options: [
    { ...connectionOption, description: 'Account to disconnect when the plugin has several' },
    {
      name: 'yes',
      shorthand: 'y',
      type: Boolean,
      description: 'Skip the confirmation prompt',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Disconnect your Gmail account', value: 'flexkit plugins disconnect gmail' },
    {
      name: 'Disconnect one of several Slack workspaces',
      value: 'flexkit plugins disconnect slack --connection 6c2f1b0e-3d4a-4f7b-9a8e-1c2d3e4f5a6b --yes',
    },
  ],
};

export const pluginsToolsCommand: Command = {
  name: 'tools',
  description:
    'List the tools a plugin offers through one of your connected accounts, with whether each only reads data. The list is cached; --refresh asks the provider again.',
  arguments: [{ name: 'pluginId', required: true }],
  options: [
    connectionOption,
    {
      name: 'refresh',
      shorthand: null,
      type: Boolean,
      description: 'Fetch the tool list from the provider instead of the cache',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List the Gmail tools', value: 'flexkit plugins tools gmail' },
    {
      name: 'Print the names of read-only tools',
      value:
        "flexkit plugins tools hubspot --json | jq -r '.servers[].tools[] | select(.annotations.readOnlyHint) | .name'",
    },
    { name: 'Refresh after changing app scopes', value: 'flexkit plugins tools shopify --refresh' },
  ],
};

export const pluginsCommand: Command = {
  name: 'plugins',
  description:
    "Manage the project's plugins: browse the catalog, install, connect accounts and list the tools the agent can use. API tokens can browse the catalog and list the tools of project accounts; installing, connecting, disconnecting and changing plugins need a user session from `flexkit login`.",
  arguments: [],
  subcommands: [
    pluginsListCommand,
    pluginsInspectCommand,
    pluginsAddCommand,
    pluginsRemoveCommand,
    pluginsConnectCommand,
    pluginsDisconnectCommand,
    pluginsToolsCommand,
  ],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List the plugins in use', value: 'flexkit plugins' },
    { name: 'Connect Google Calendar for the whole project', value: 'flexkit plugins connect google-calendar' },
    { name: 'List the tools of the Slack plugin', value: 'flexkit plugins tools slack' },
  ],
};
