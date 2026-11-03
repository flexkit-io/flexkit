import type { Command, CommandOption } from '../help';

const projectOption: CommandOption = {
  name: 'project',
  shorthand: 'p',
  type: String,
  argument: 'ID',
  description: 'Project to use (default: linked project)',
  deprecated: false,
};

const jsonOption = (description: string): CommandOption => ({
  name: 'json',
  shorthand: null,
  type: Boolean,
  description,
  deprecated: false,
});

export const activityListCommand: Command = {
  name: 'ls',
  description:
    'List your Activity inbox in this project, newest first: approval requests, automation results and failures, chat monitor events and questions the agent asked you. Dismissed items are hidden.',
  arguments: [],
  options: [
    {
      name: 'unread',
      shorthand: null,
      type: Boolean,
      description: 'Show only unread items (filters the fetched page)',
      deprecated: false,
    },
    {
      name: 'needs-action',
      shorthand: null,
      type: Boolean,
      description: 'Show only open approval requests and questions that wait on you',
      deprecated: false,
    },
    {
      name: 'limit',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of items to fetch, 1–100 (default: 25)',
      deprecated: false,
    },
    {
      name: 'offset',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of items to skip (default: 0)',
      deprecated: false,
    },
    {
      name: 'follow',
      shorthand: 'f',
      type: Boolean,
      description: 'Keep running and print new items as they arrive (Ctrl+C to stop)',
      deprecated: false,
    },
    {
      name: 'interval',
      shorthand: null,
      type: Number,
      argument: 'SECONDS',
      description: 'How often --follow checks for new items (default: 5, minimum: 2)',
      deprecated: false,
    },
    jsonOption('Print the items as JSON (with --follow: one item per line)'),
    projectOption,
  ],
  examples: [
    { name: 'Show your inbox', value: 'flexkit activity' },
    { name: 'Show what waits on you', value: 'flexkit activity ls --needs-action' },
    { name: 'Watch for new items while you work', value: 'flexkit activity ls --follow' },
    {
      name: 'Print the ids of unread automation failures',
      value: 'flexkit activity ls --unread --json | jq -r \'.[] | select(.kind == "automation_failure") | .id\'',
    },
  ],
};

export const activityInspectCommand: Command = {
  name: 'inspect',
  description: 'Show one Activity item in full, with the command that continues it (approve, answer, open the run).',
  arguments: [{ name: 'itemId', required: true }],
  options: [
    {
      name: 'read',
      shorthand: null,
      type: Boolean,
      description: 'Also mark the item read',
      deprecated: false,
    },
    jsonOption('Print the item as JSON'),
    projectOption,
  ],
  examples: [
    { name: 'Show an item', value: 'flexkit activity inspect 0b7e2c4a-91d3-4f5e-8a6b-3c2d1e0f9a87' },
    {
      name: 'Show an item and mark it read',
      value: 'flexkit activity inspect 0b7e2c4a-91d3-4f5e-8a6b-3c2d1e0f9a87 --read',
    },
  ],
};

export const activityReadCommand: Command = {
  name: 'read',
  description: 'Mark Activity items read, by id or all unread items at once.',
  arguments: [{ name: 'itemId...', required: false }],
  options: [
    {
      name: 'all',
      shorthand: null,
      type: Boolean,
      description: 'Mark every unread item read',
      deprecated: false,
    },
    jsonOption('Print the API response as JSON'),
    projectOption,
  ],
  examples: [
    {
      name: 'Mark two items read',
      value: 'flexkit activity read 0b7e2c4a-91d3-4f5e-8a6b-3c2d1e0f9a87 5d1f3e2a-7c4b-4e8d-9f0a-1b2c3d4e5f60',
    },
    { name: 'Clear the unread badge', value: 'flexkit activity read --all' },
  ],
};

export const activityDismissCommand: Command = {
  name: 'dismiss',
  description:
    'Hide Activity items from your inbox. A dismissed approval or question is not decided; it only leaves the list.',
  arguments: [{ name: 'itemId...', required: true }],
  options: [jsonOption('Print the dismissed items as JSON'), projectOption],
  examples: [{ name: 'Dismiss an item', value: 'flexkit activity dismiss 0b7e2c4a-91d3-4f5e-8a6b-3c2d1e0f9a87' }],
};

export const activitySummaryCommand: Command = {
  name: 'summary',
  description: 'Print how many items are unread and how many wait on you (the Studio Activity badge).',
  arguments: [],
  options: [jsonOption('Print the counts as JSON'), projectOption],
  examples: [
    { name: 'Show the counts', value: 'flexkit activity summary' },
    {
      name: 'Fail a script step when something waits on you',
      value: 'test "$(flexkit activity summary --json | jq \'.needsActionCount\')" -eq 0',
    },
  ],
};

export const activityCommand: Command = {
  name: 'activity',
  description:
    'Read your Activity inbox in a project: approval requests, automation results and failures, chat monitor events and agent questions. Runs `ls` when no subcommand is given.',
  arguments: [],
  subcommands: [
    activityListCommand,
    activityInspectCommand,
    activityReadCommand,
    activityDismissCommand,
    activitySummaryCommand,
  ],
  options: [projectOption],
  examples: [
    { name: 'Show your inbox', value: 'flexkit activity' },
    { name: 'Show the unread and needs-action counts', value: 'flexkit activity summary' },
    { name: 'Mark everything read', value: 'flexkit activity read --all' },
  ],
};
