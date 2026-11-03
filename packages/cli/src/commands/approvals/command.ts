import type { Command, CommandOption } from '../help';

const projectOption: CommandOption = {
  name: 'project',
  shorthand: 'p',
  type: String,
  argument: 'ID',
  description: 'Project of the approvals (default: linked project)',
  deprecated: false,
};

const jsonOption: CommandOption = {
  name: 'json',
  shorthand: null,
  type: Boolean,
  description: 'Print the API response as JSON on stdout',
  deprecated: false,
};

const yesOption: CommandOption = {
  name: 'yes',
  shorthand: 'y',
  type: Boolean,
  description: 'Skip the confirmation prompt',
  deprecated: false,
};

const reasonOption: CommandOption = {
  name: 'reason',
  shorthand: null,
  type: String,
  argument: 'TEXT',
  description: 'Why you decided this way; stored with the decision and shown to the agent',
  deprecated: false,
};

export const approvalsListCommand: Command = {
  name: 'ls',
  description:
    'List approval requests: data changes, plugin calls, sandbox commands, schema changes and proposed automations or skills that automation runs wait on. Shows pending requests unless --all or --status is given. Requests from a chat are not listed: the chat prints their id, and inspect, approve and reject take it.',
  arguments: [],
  options: [
    {
      name: 'all',
      shorthand: null,
      type: Boolean,
      description: 'Show requests in every status, not only pending ones',
      deprecated: false,
    },
    {
      name: 'status',
      shorthand: 's',
      type: String,
      argument: 'STATUS',
      description: 'Only this status: pending, approved, rejected, expired or cancelled (default: pending)',
      deprecated: false,
    },
    {
      name: 'run',
      shorthand: 'r',
      type: String,
      argument: 'RUN_ID',
      description: 'Only requests of this automation run',
      deprecated: false,
    },
    {
      name: 'limit',
      shorthand: 'n',
      type: Number,
      argument: 'N',
      description: 'Number of requests to show (default: 25, max: 100)',
      deprecated: false,
    },
    {
      name: 'offset',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of requests to skip, for paging (default: 0)',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List pending approval requests', value: 'flexkit approvals ls' },
    {
      name: 'List every request of one run',
      value: 'flexkit approvals ls --all --run 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f',
    },
    { name: 'List rejected requests', value: 'flexkit approvals ls --status rejected --limit 50' },
    { name: 'Print the ids of pending requests', value: "flexkit approvals ls --json | jq -r '.approvals[].id'" },
  ],
};

export const approvalsInspectCommand: Command = {
  name: 'inspect',
  description:
    'Show one approval request: what it would do (the operations), how many records it affects, its preview, and its decision.',
  arguments: [{ name: 'approvalId', required: true }],
  options: [jsonOption, projectOption],
  examples: [
    {
      name: 'Review a request before deciding',
      value: 'flexkit approvals inspect 7c1e3a5b-9d2f-4e6a-8b0c-1d3f5a7c9e2b',
    },
    {
      name: 'Print the before/after preview',
      value: "flexkit approvals inspect 7c1e3a5b-9d2f-4e6a-8b0c-1d3f5a7c9e2b --json | jq '.approval.preview'",
    },
  ],
};

export const approvalsApproveCommand: Command = {
  name: 'approve',
  description:
    'Approve a pending request. The change runs right away and a paused automation run continues. If the affected data changed since the request was made, the approval is refused until you review it again (or pass --force).',
  arguments: [{ name: 'approvalId', required: true }],
  options: [
    reasonOption,
    {
      name: 'remember',
      shorthand: null,
      type: Boolean,
      description: 'For a plugin call: also always allow this plugin tool in the automation from now on',
      deprecated: false,
    },
    {
      name: 'force',
      shorthand: null,
      type: Boolean,
      description: 'Approve even if the affected data changed since the preview was made',
      deprecated: false,
    },
    yesOption,
    jsonOption,
    projectOption,
  ],
  examples: [
    {
      name: 'Approve a request after a prompt',
      value: 'flexkit approvals approve 7c1e3a5b-9d2f-4e6a-8b0c-1d3f5a7c9e2b',
    },
    {
      name: 'Approve a plugin call and allow the tool from now on',
      value: 'flexkit approvals approve 7c1e3a5b-9d2f-4e6a-8b0c-1d3f5a7c9e2b --remember --yes',
    },
    {
      name: 'Approve with a note, in a script',
      value: 'flexkit approvals approve 7c1e3a5b-9d2f-4e6a-8b0c-1d3f5a7c9e2b --reason "Checked with finance" --yes',
    },
  ],
};

export const approvalsDenyCommand: Command = {
  name: 'deny',
  description:
    'Reject a pending request. Nothing changes, and the agent is told the request was rejected (with your reason).',
  arguments: [{ name: 'approvalId', required: true }],
  options: [reasonOption, jsonOption, projectOption],
  examples: [
    { name: 'Reject a request', value: 'flexkit approvals deny 7c1e3a5b-9d2f-4e6a-8b0c-1d3f5a7c9e2b' },
    {
      name: 'Reject it and tell the agent why',
      value: 'flexkit approvals deny 7c1e3a5b-9d2f-4e6a-8b0c-1d3f5a7c9e2b --reason "Only update draft products"',
    },
  ],
};

export const approvalsCommand: Command = {
  name: 'approvals',
  description:
    'Review and decide approval requests from automations and chats. API tokens can list and inspect automation approvals; approving and denying needs a signed-in member (`flexkit login`).',
  arguments: [],
  subcommands: [approvalsListCommand, approvalsInspectCommand, approvalsApproveCommand, approvalsDenyCommand],
  options: [projectOption],
  examples: [
    { name: 'List pending requests', value: 'flexkit approvals ls' },
    {
      name: 'Review and approve one',
      value:
        'flexkit approvals inspect 7c1e3a5b-9d2f-4e6a-8b0c-1d3f5a7c9e2b && flexkit approvals approve 7c1e3a5b-9d2f-4e6a-8b0c-1d3f5a7c9e2b',
    },
  ],
};
