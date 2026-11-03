import type { Command, CommandOption } from '../help';

const projectOption: CommandOption = {
  name: 'project',
  shorthand: 'p',
  type: String,
  argument: 'ID',
  description: 'Project to use (default: linked project, FLEXKIT_PROJECT_ID, or the only project in flexkit.config.ts)',
  deprecated: false,
};

const jsonOption: CommandOption = {
  name: 'json',
  shorthand: null,
  type: Boolean,
  description: 'Print the result as JSON on stdout',
  deprecated: false,
};

export const deploymentsLsCommand: Command = {
  name: 'ls',
  description:
    'List the schema deployments of the project, newest first, with their state, size, author and duration. The deployment that is currently live is marked.',
  arguments: [],
  options: [
    {
      name: 'state',
      shorthand: 's',
      type: String,
      argument: 'STATE',
      description:
        'Only deployments in this state: running, completed, failed, queued, validating, building, uploading, activating (default: all)',
      deprecated: false,
    },
    {
      name: 'mine',
      shorthand: 'm',
      type: Boolean,
      description: 'Only deployments you started',
      deprecated: false,
    },
    {
      name: 'limit',
      shorthand: 'n',
      type: Number,
      argument: 'N',
      description: 'Maximum number of deployments to list (default: 25)',
      deprecated: false,
    },
    {
      name: 'cursor',
      shorthand: null,
      type: String,
      argument: 'CURSOR',
      description: 'Continue a previous listing from the cursor it printed',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List recent deployments', value: 'flexkit deployments ls' },
    { name: 'List your failed deployments', value: 'flexkit deployments ls --state failed --mine' },
    {
      name: 'List the last 100 deployments of another project',
      value: 'flexkit deployments ls -p k3m9x2q7wd --limit 100',
    },
    {
      name: 'Print the id of the live deployment',
      value: 'flexkit deployments ls --json | jq -r .activeDeploymentId',
    },
  ],
};

export const deploymentsInspectCommand: Command = {
  name: 'inspect',
  description:
    'Show one deployment: state, author, timings, entity counts, options, errors with hints, warnings and the stage history. With --diff, also print what it changed compared with the schema that was live before it.',
  arguments: [{ name: 'id', required: true }],
  options: [
    {
      name: 'diff',
      shorthand: null,
      type: Boolean,
      description: 'Print the schema changes of the deployment (baseline → deployed)',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Inspect a deployment', value: 'flexkit deployments inspect 0b6f1c52-8a43-4d7e-9a51-3f2e8c1d4b90' },
    {
      name: 'See what a deployment changed',
      value: 'flexkit deployments inspect 0b6f1c52-8a43-4d7e-9a51-3f2e8c1d4b90 --diff',
    },
    {
      name: 'Print the error of the latest failed deployment',
      value:
        "flexkit deployments inspect $(flexkit deployments ls --state failed --json | jq -r '.items[0].id') --json | jq .error",
    },
  ],
};

export const deploymentsLogsCommand: Command = {
  name: 'logs',
  description:
    'Print the progress of a deployment: its stage history, then live state changes until it completes or fails. Exits with code 1 when the deployment failed, so scripts can wait on a deploy started elsewhere.',
  arguments: [{ name: 'id', required: true }],
  options: [
    {
      name: 'no-follow',
      shorthand: null,
      type: Boolean,
      description: 'Print what happened so far and exit instead of waiting for the deployment to finish',
      deprecated: false,
    },
    {
      name: 'json',
      shorthand: null,
      type: Boolean,
      description: 'Print the stage history, events and final state as one JSON object when done',
      deprecated: false,
    },
    projectOption,
  ],
  examples: [
    { name: 'Follow a running deployment', value: 'flexkit deployments logs 0b6f1c52-8a43-4d7e-9a51-3f2e8c1d4b90' },
    {
      name: 'Wait for the running deployment and fail the job if it fails',
      value: "flexkit deployments logs $(flexkit deployments ls --state running --json | jq -r '.items[0].id')",
    },
    {
      name: 'Print the stages of a finished deployment as JSON',
      value: 'flexkit deployments logs 0b6f1c52-8a43-4d7e-9a51-3f2e8c1d4b90 --no-follow --json',
    },
  ],
};

export const deploymentsCommand: Command = {
  name: 'deployments',
  description:
    'Browse the schema deployment history of a project: list deployments, inspect one, and follow its progress. Start deployments with `flexkit deploy`.',
  arguments: [{ name: 'subcommand', required: false }],
  subcommands: [deploymentsLsCommand, deploymentsInspectCommand, deploymentsLogsCommand],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List recent deployments', value: 'flexkit deployments ls' },
    { name: 'Inspect a deployment', value: 'flexkit deployments inspect 0b6f1c52-8a43-4d7e-9a51-3f2e8c1d4b90' },
    { name: 'Follow a running deployment', value: 'flexkit deployments logs 0b6f1c52-8a43-4d7e-9a51-3f2e8c1d4b90' },
  ],
};
