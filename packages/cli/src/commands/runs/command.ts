import type { Command, CommandOption } from '../help';

const projectOption: CommandOption = {
  name: 'project',
  shorthand: 'p',
  type: String,
  argument: 'ID',
  description: 'Project of the runs (default: linked project)',
  deprecated: false,
};

const jsonOption: CommandOption = {
  name: 'json',
  shorthand: null,
  type: Boolean,
  description: 'Print the API response as JSON on stdout',
  deprecated: false,
};

export const runsListCommand: Command = {
  name: 'ls',
  description:
    'List recent automation runs, newest first: all runs you can see in the project, only runs of your own automations, or the runs of one automation.',
  arguments: [],
  options: [
    {
      name: 'automation',
      shorthand: 'a',
      type: String,
      argument: 'ID',
      description: 'Only runs of this automation',
      deprecated: false,
    },
    {
      name: 'mine',
      shorthand: null,
      type: Boolean,
      description: 'Only runs of automations you created (ignored with --automation)',
      deprecated: false,
    },
    {
      name: 'limit',
      shorthand: 'n',
      type: Number,
      argument: 'N',
      description: 'Number of runs to show (default: 20, max: 100)',
      deprecated: false,
    },
    {
      name: 'offset',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of runs to skip, for paging (default: 0)',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List the latest runs in the linked project', value: 'flexkit runs ls' },
    {
      name: 'List the last 50 runs of one automation',
      value: 'flexkit runs ls --automation 3f1c9a2e-8d4b-4c1a-9f0e-2b7d5e6a1c3f --limit 50',
    },
    {
      name: 'Show the second page of runs of your own automations',
      value: 'flexkit runs ls --mine --limit 20 --offset 20',
    },
    {
      name: 'Print the ids of failed runs with jq',
      value: 'flexkit runs ls --json | jq -r \'.runs[] | select(.status == "failed") | .id\'',
    },
  ],
};

export const runsInspectCommand: Command = {
  name: 'inspect',
  description: 'Show one run: its automation, status, trigger, timing, summary and error.',
  arguments: [{ name: 'runId', required: true }],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Show a run', value: 'flexkit runs inspect 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f' },
    {
      name: 'Print the run summary only',
      value: "flexkit runs inspect 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f --json | jq -r '.run.summary'",
    },
  ],
};

export const runsLogsCommand: Command = {
  name: 'logs',
  description:
    "Print a run's events: the agent's text, tool calls with their results, approval pauses, errors and the final status. An active run streams live until it ends or pauses for approval; --follow keeps waiting through approval pauses until the run finishes.",
  arguments: [{ name: 'runId', required: true }],
  options: [
    {
      name: 'follow',
      shorthand: 'f',
      type: Boolean,
      description: 'Keep streaming through approval pauses until the run finishes (default: off)',
      deprecated: false,
    },
    {
      name: 'json',
      shorthand: null,
      type: Boolean,
      description: 'Print the raw stream chunks as newline-delimited JSON on stdout',
      deprecated: false,
    },
    projectOption,
  ],
  examples: [
    { name: 'Replay the events of a finished run', value: 'flexkit runs logs 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f' },
    {
      name: 'Follow an active run until it finishes',
      value: 'flexkit runs logs 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f --follow',
    },
    {
      name: 'List the tools a run called',
      value:
        'flexkit runs logs 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f --json | jq -r \'select(.type == "tool-input-available") | .toolName\'',
    },
  ],
};

export const runsTranscriptCommand: Command = {
  name: 'transcript',
  description:
    'Print the stored model transcript of a finished run (system, user, assistant and tool messages), for debugging. Owners and developers only.',
  arguments: [{ name: 'runId', required: true }],
  options: [
    {
      name: 'output',
      shorthand: 'o',
      type: String,
      argument: 'FILE',
      description: 'Write the transcript as JSON to this file instead of printing it',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Read the transcript of a run', value: 'flexkit runs transcript 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f' },
    {
      name: 'Save it to a file',
      value: 'flexkit runs transcript 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f --output run-transcript.json',
    },
    {
      name: 'Count the assistant messages',
      value:
        'flexkit runs transcript 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f --json | jq \'[.transcript[] | select(.role == "assistant")] | length\'',
    },
  ],
};

export const runsArtifactsCommand: Command = {
  name: 'artifacts',
  description:
    'List the files a run generated (HTML and PDF reports, CSV and JSON exports), or download them with --download.',
  arguments: [
    { name: 'runId', required: true },
    { name: 'artifactId', required: false },
  ],
  options: [
    {
      name: 'download',
      shorthand: null,
      type: Boolean,
      description: 'Download the artifacts (all of them, or only <artifactId>)',
      deprecated: false,
    },
    {
      name: 'out-dir',
      shorthand: 'o',
      type: String,
      argument: 'DIR',
      description: 'Folder to save downloads in (default: current folder)',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List the files of a run', value: 'flexkit runs artifacts 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f' },
    {
      name: 'Download all of them into ./reports',
      value: 'flexkit runs artifacts 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f --download --out-dir reports',
    },
    {
      name: 'Download one file',
      value:
        'flexkit runs artifacts 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f 5e7a9c1b-3d5f-4b7a-9c1e-3f5a7c9e1b3d --download',
    },
  ],
};

export const runsCancelCommand: Command = {
  name: 'cancel',
  description:
    'Cancel an active run (running or waiting for approval). The agent stops, its subtasks and bulk jobs are cancelled and its pending approvals are closed.',
  arguments: [{ name: 'runId', required: true }],
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
    { name: 'Cancel a run', value: 'flexkit runs cancel 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f' },
    {
      name: 'Cancel without a prompt (scripts)',
      value: 'flexkit runs cancel 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f --yes',
    },
  ],
};

export const runsCommand: Command = {
  name: 'runs',
  description:
    'Inspect automation runs: list them, read their events and transcripts, download their files, cancel them.',
  arguments: [],
  subcommands: [
    runsListCommand,
    runsInspectCommand,
    runsLogsCommand,
    runsTranscriptCommand,
    runsArtifactsCommand,
    runsCancelCommand,
  ],
  options: [projectOption],
  examples: [
    { name: 'List recent runs', value: 'flexkit runs ls' },
    { name: 'Follow a run live', value: 'flexkit runs logs 9b2d4f6a-1c3e-4a5b-8d7f-0e2c4a6b8d1f -f' },
    {
      name: 'Start an automation and follow its run',
      value: 'flexkit automations run 3f1c9a2e-8d4b-4c1a-9f0e-2b7d5e6a1c3f --follow',
    },
  ],
};
