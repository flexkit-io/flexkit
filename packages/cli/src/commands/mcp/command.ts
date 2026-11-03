import type { Command, CommandOption } from '../help';

const reachOptions: CommandOption[] = [
  {
    name: 'team',
    shorthand: null,
    type: Boolean,
    description: "Reach every project of the project's team instead of one project",
    deprecated: false,
  },
  {
    name: 'account',
    shorthand: null,
    type: Boolean,
    description: 'Reach every project you are a member of',
    deprecated: false,
  },
  {
    name: 'read-only',
    shorthand: null,
    type: Boolean,
    description: 'Leave out the tools that change project data (default: off)',
    deprecated: false,
  },
  {
    name: 'project',
    shorthand: 'p',
    type: String,
    argument: 'ID',
    description: 'Project the URL points to (default: linked project)',
    deprecated: false,
  },
];

export const mcpUrlCommand: Command = {
  name: 'url',
  description:
    "Print the URL of Flexkit's hosted MCP server for the project, to add to any MCP client. The client signs in with your Flexkit account (OAuth) the first time, so the URL carries no secret.",
  arguments: [],
  options: [
    ...reachOptions,
    {
      name: 'json',
      shorthand: null,
      type: Boolean,
      description: 'Print the URL with its team and project ids as JSON',
      deprecated: false,
    },
  ],
  examples: [
    { name: 'URL of the linked project', value: 'flexkit mcp url' },
    { name: 'Read-only URL of another project', value: 'flexkit mcp url --project abcdefghij --read-only' },
    { name: 'URL that reaches all your projects', value: 'flexkit mcp url --account' },
    { name: 'Copy it to the clipboard (macOS)', value: 'flexkit mcp url | pbcopy' },
  ],
};

export const mcpInstallCommand: Command = {
  name: 'install',
  description:
    "Add the Flexkit MCP server to an AI client. For Claude Code it runs `claude mcp add`; for Cursor, VS Code and Windsurf it merges an entry into the client's MCP config file and keeps every other server; for Claude Desktop it prints the steps to add a custom connector. The client asks you to sign in to Flexkit the first time it connects.",
  arguments: [],
  options: [
    {
      name: 'client',
      shorthand: null,
      type: String,
      argument: 'NAME',
      description: 'claude-code, claude-desktop, cursor, vscode or windsurf (default: prompt)',
      deprecated: false,
    },
    {
      name: 'scope',
      shorthand: null,
      type: String,
      argument: 'SCOPE',
      description:
        'Where to add it: local, project or user for Claude Code (default: local); project or user for Cursor and VS Code (default: project); Windsurf only has user',
      deprecated: false,
    },
    {
      name: 'name',
      shorthand: null,
      type: String,
      argument: 'NAME',
      description: 'Server name in the client (default: flexkit)',
      deprecated: false,
    },
    {
      name: 'dry-run',
      shorthand: null,
      type: Boolean,
      description: 'Print the command or the config change without applying it',
      deprecated: false,
    },
    {
      name: 'yes',
      shorthand: 'y',
      type: Boolean,
      description: 'Replace an existing server with the same name without asking',
      deprecated: false,
    },
    ...reachOptions,
  ],
  examples: [
    { name: 'Add the linked project to Claude Code', value: 'flexkit mcp install --client claude-code' },
    { name: 'Add it to this workspace in Cursor', value: 'flexkit mcp install --client cursor' },
    {
      name: 'Preview the VS Code user config change',
      value: 'flexkit mcp install --client vscode --scope user --dry-run',
    },
    {
      name: 'Add a read-only connection to all your projects in Windsurf',
      value: 'flexkit mcp install --client windsurf --account --read-only --name flexkit-ro',
    },
  ],
};

export const mcpCommand: Command = {
  name: 'mcp',
  description:
    "Connect AI clients (Claude Code, Claude Desktop, Cursor, VS Code, Windsurf…) to Flexkit's hosted MCP server, so their agents can query and change your project's data with your role.",
  arguments: [],
  subcommands: [mcpUrlCommand, mcpInstallCommand],
  options: reachOptions,
  examples: [
    { name: 'Print the MCP URL of the linked project', value: 'flexkit mcp url' },
    { name: 'Add the project to Claude Code', value: 'flexkit mcp install --client claude-code' },
  ],
};
