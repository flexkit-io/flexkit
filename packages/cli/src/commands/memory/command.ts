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
const nameOption = option('name', String, 'How the agent should address you (kept unchanged when omitted)', 'NAME');

export const memoryShowCommand: Command = {
  name: 'show',
  description:
    'Show what the agent remembers about you in this project: your preferred name, your memory document (Markdown) and the read-only company memories every member shares.',
  arguments: [],
  options: [
    option('content', Boolean, 'Print only your memory document on stdout (for redirecting to a file)'),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Show your memory', value: 'flexkit memory show' },
    { name: 'Save it to a file to edit it', value: 'flexkit memory show --content > memory.md' },
    { name: 'Print the company memories with jq', value: "flexkit memory show --json | jq -r '.companyMemories[]'" },
  ],
};

export const memorySetCommand: Command = {
  name: 'set',
  description:
    'Replace your memory document with a Markdown file (or - for stdin). The Chat Agent and the MCP server read it in every session and may rewrite it as they learn.',
  arguments: [{ name: 'file|-', required: true }],
  options: [nameOption, jsonOption, projectOption],
  examples: [
    { name: 'Replace the memory with a file', value: 'flexkit memory set memory.md' },
    { name: 'Also set your preferred name', value: 'flexkit memory set memory.md --name Dani' },
    {
      name: 'Append a note from a script',
      value: '{ flexkit memory show --content; echo "- Prices are in EUR"; } | flexkit memory set -',
    },
  ],
};

export const memoryEditCommand: Command = {
  name: 'edit',
  description:
    'Open your memory document in $VISUAL or $EDITOR (vi by default) and save it when the editor closes. Needs a terminal.',
  arguments: [],
  options: [nameOption, projectOption],
  examples: [
    { name: 'Edit the memory', value: 'flexkit memory edit' },
    { name: 'Edit it in VS Code', value: 'EDITOR="code --wait" flexkit memory edit' },
  ],
};

export const memoryClearCommand: Command = {
  name: 'clear',
  description:
    'Empty your memory document. Your preferred name and the company memories stay. The agent starts learning again from your next sessions.',
  arguments: [],
  options: [yesOption, jsonOption, projectOption],
  examples: [
    { name: 'Clear the memory', value: 'flexkit memory clear' },
    { name: 'Clear it without the prompt', value: 'flexkit memory clear --yes' },
  ],
};

export const memoryCommand: Command = {
  name: 'memory',
  description:
    "Read and edit what the agent remembers about you in a project. The memory is personal: it needs your own session from `flexkit login`, and API tokens can't read or change it.",
  arguments: [],
  subcommands: [memoryShowCommand, memorySetCommand, memoryEditCommand, memoryClearCommand],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Show your memory', value: 'flexkit memory show' },
    { name: 'Edit it in your editor', value: 'flexkit memory edit' },
    { name: 'Replace it with a file', value: 'flexkit memory set memory.md' },
    { name: 'Start over', value: 'flexkit memory clear' },
  ],
};
