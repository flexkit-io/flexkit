import type { Command, CommandOption } from '../help';

const ID = '3f1c9a2e-8d4b-4c1a-9f0e-2b7d5e6a1c3f';

const projectOption: CommandOption = {
  name: 'project',
  shorthand: 'p',
  type: String,
  argument: 'ID',
  description: 'Project of the automations (default: linked project)',
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

function option(name: string, description: string, argument?: string, shorthand: string | null = null): CommandOption {
  return {
    name,
    shorthand,
    type: argument ? String : Boolean,
    ...(argument ? { argument } : {}),
    description,
    deprecated: false,
  };
}

const fileOption = option(
  'file',
  'Automation definition as JSON: a file path, @file, - for stdin, or inline JSON (see `automations pull`)',
  'FILE',
  'f'
);

const definitionOptions: CommandOption[] = [
  option('name', 'Name of the automation', 'NAME'),
  option(
    'instructions',
    'What the agent should do: inline text, a file path, @file, or - for stdin (alias: --prompt)',
    'TEXT|FILE',
    'i'
  ),
  option('model', 'Model id, from `flexkit automations models` (default on create: auto)', 'ID', 'm'),
  option('visibility', 'Who can see and run it: project, space or personal (default on create: project)', 'VISIBILITY'),
  option('space', 'Space the automation belongs to; sets --visibility space', 'SPACE_ID'),
  option(
    'mutation-policy',
    'require_approval (default on create) or auto_approve for data changes the agent makes',
    'POLICY'
  ),
];

export const automationsListCommand: Command = {
  name: 'ls',
  description: 'List the automations you can see in the project, most recently run first.',
  arguments: [],
  options: [
    option('enabled', 'Only enabled (active) automations'),
    option('disabled', 'Only disabled (inactive) automations'),
    option('search', 'Only automations whose name contains this text', 'TEXT', 'q'),
    option('visibility', 'Only these visibilities, comma-separated: project, space, personal', 'LIST'),
    { ...option('limit', 'Number of automations to show (default: 25, max: 100)', 'N', 'n'), type: Number },
    { ...option('offset', 'Number of automations to skip, for paging (default: 0)', 'N'), type: Number },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List automations in the linked project', value: 'flexkit automations ls' },
    { name: 'Find enabled automations about invoices', value: 'flexkit automations ls --enabled --search invoice' },
    { name: 'List your personal automations', value: 'flexkit automations ls --visibility personal' },
    {
      name: 'Print the names of disabled automations',
      value: "flexkit automations ls --disabled --json | jq -r '.automations[].name'",
    },
  ],
};

export const automationsInspectCommand: Command = {
  name: 'inspect',
  description: 'Show one automation: its settings, triggers (with the webhook URL), attachments and instructions.',
  arguments: [{ name: 'automationId', required: true }],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Show an automation', value: `flexkit automations inspect ${ID}` },
    {
      name: 'Print the webhook URL',
      value: `flexkit automations inspect ${ID} --json | jq -r '.automation.triggers[] | select(.type == "webhook") | .url'`,
    },
  ],
};

export const automationsCreateCommand: Command = {
  name: 'create',
  description:
    'Create an automation from flags, from a JSON definition (--file), or both: flags override the file. New automations are disabled unless you pass --enable.',
  arguments: [],
  options: [
    fileOption,
    ...definitionOptions,
    { ...option('schedule', 'Add a schedule trigger with this cron expression (repeatable)', 'CRON'), type: [String] },
    option('timezone', 'IANA timezone of the --schedule triggers (default: UTC)', 'TZ'),
    option('enable', 'Enable the automation right away (default: disabled)'),
    jsonOption,
    projectOption,
  ],
  examples: [
    {
      name: 'Create a daily automation from flags',
      value: [
        'flexkit automations create --name "Daily stock report" \\',
        '  --instructions "Summarize products with stock below 10 and post the list." \\',
        '  --schedule "0 8 * * 1-5" --timezone Europe/Madrid --enable',
      ],
    },
    {
      name: 'Create one with instructions from a Markdown file',
      value: 'flexkit automations create --name "Weekly churn review" --instructions @prompts/churn.md',
    },
    {
      name: 'Create one from a JSON definition',
      value: 'flexkit automations create --file automations/stock-report.json',
    },
    {
      name: 'Copy an automation into another project',
      value: `flexkit automations pull ${ID} - | flexkit automations create --file - --project prod-project-id`,
    },
  ],
};

export const automationsUpdateCommand: Command = {
  name: 'update',
  description:
    'Change an automation. Only what you pass changes: flags and the fields in --file are applied on top of the current definition. Replace triggers or tools by putting the full `triggers` or `toolConfigs` list in --file.',
  arguments: [{ name: 'automationId', required: true }],
  options: [
    fileOption,
    ...definitionOptions,
    option('enable', 'Enable the automation'),
    option('disable', 'Disable the automation'),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Rename an automation', value: `flexkit automations update ${ID} --name "Stock report (EU)"` },
    {
      name: 'Replace the instructions from a file',
      value: `flexkit automations update ${ID} --instructions @prompts/stock-report.md`,
    },
    {
      name: 'Change the triggers with a partial definition',
      value: `echo '{"triggers":[{"type":"schedule","cron":"0 7 * * *","timezone":"UTC"}]}' | flexkit automations update ${ID} --file -`,
    },
  ],
};

export const automationsEnableCommand: Command = {
  name: 'enable',
  description: 'Enable an automation so its triggers start runs.',
  arguments: [{ name: 'automationId', required: true }],
  options: [jsonOption, projectOption],
  examples: [{ name: 'Enable an automation', value: `flexkit automations enable ${ID}` }],
};

export const automationsDisableCommand: Command = {
  name: 'disable',
  description: 'Disable an automation. Its triggers stop starting runs; you can still run it by hand.',
  arguments: [{ name: 'automationId', required: true }],
  options: [jsonOption, projectOption],
  examples: [{ name: 'Disable an automation', value: `flexkit automations disable ${ID}` }],
};

export const automationsRemoveCommand: Command = {
  name: 'rm',
  description: 'Delete an automation with its triggers. Past runs stay in the run history.',
  arguments: [{ name: 'automationId', required: true }],
  options: [yesOption, jsonOption, projectOption],
  examples: [
    { name: 'Delete an automation', value: `flexkit automations rm ${ID}` },
    { name: 'Delete without a prompt (scripts)', value: `flexkit automations rm ${ID} --yes` },
  ],
};

export const automationsRunCommand: Command = {
  name: 'run',
  description:
    "Start a manual run of an automation now (it does not need to be enabled). Prints the run id; --follow streams the run's events and --wait waits silently, both until the run finishes, and exit with code 1 when it fails.",
  arguments: [{ name: 'automationId', required: true }],
  options: [
    option('follow', "Stream the run's events until it finishes", undefined, 'f'),
    option('wait', 'Wait until the run finishes and print its result', undefined, 'w'),
    {
      ...jsonOption,
      description: 'Print the result as JSON (with --follow: the stream chunks as NDJSON)',
    },
    projectOption,
  ],
  examples: [
    { name: 'Start a run', value: `flexkit automations run ${ID}` },
    { name: 'Start a run and watch it', value: `flexkit automations run ${ID} --follow` },
    {
      name: 'Run it from CI and fail the job when the run fails',
      value: `flexkit automations run ${ID} --wait --json | jq -r '.run.summary'`,
    },
  ],
};

export const automationsToolsCommand: Command = {
  name: 'tools',
  description:
    "Show what an automation can use: the project's custom tools (and which are attached), its plugin tool settings, Slack and Teams delivery, and attached skills.",
  arguments: [{ name: 'automationId', required: true }],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Show the tools of an automation', value: `flexkit automations tools ${ID}` },
    {
      name: 'Print the attached custom tools',
      value: `flexkit automations tools ${ID} --json | jq -r '.customToolNames[]'`,
    },
  ],
};

export const automationsModelsCommand: Command = {
  name: 'models',
  description: 'List the models an automation can use, with the ids to pass to --model.',
  arguments: [],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List models', value: 'flexkit automations models' },
    { name: 'Print the model ids', value: "flexkit automations models --json | jq -r '.models[].id'" },
  ],
};

export const automationsCreditsCommand: Command = {
  name: 'credits',
  description: "Show the AI credit balance of the project's team, which automation runs draw from.",
  arguments: [],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Show the credit balance', value: 'flexkit automations credits' },
    {
      name: 'Check for a low balance in a script',
      value: "flexkit automations credits --json | jq '.creditBalance.isLowBalance'",
    },
  ],
};

export const automationsPullCommand: Command = {
  name: 'pull',
  description:
    'Save an automation definition as JSON (for version control or copying it to another project). Without a file, or with -, it is printed on stdout. Webhook secrets are included: keep such files out of public repositories.',
  arguments: [
    { name: 'automationId', required: true },
    { name: 'file', required: false },
  ],
  options: [projectOption],
  examples: [
    { name: 'Save a definition to a file', value: `flexkit automations pull ${ID} automations/stock-report.json` },
    { name: 'Print it', value: `flexkit automations pull ${ID}` },
  ],
};

export const automationsPushCommand: Command = {
  name: 'push',
  description:
    'Apply a JSON definition saved with `pull`: update the automation of its `id`, or create a new automation when the file has no id (or with --create).',
  arguments: [{ name: 'file', required: true }],
  options: [option('create', 'Always create a new automation, ignoring the id in the file'), jsonOption, projectOption],
  examples: [
    { name: 'Apply a changed definition', value: 'flexkit automations push automations/stock-report.json' },
    {
      name: 'Create a copy in another project',
      value: 'flexkit automations push automations/stock-report.json --create --project prod-project-id',
    },
  ],
};

export const automationsCommand: Command = {
  name: 'automations',
  description:
    'Manage automations: AI agents that run instructions on a schedule, a webhook, a data change or on demand. See also `flexkit runs` and `flexkit approvals`.',
  arguments: [],
  subcommands: [
    automationsListCommand,
    automationsInspectCommand,
    automationsCreateCommand,
    automationsUpdateCommand,
    automationsEnableCommand,
    automationsDisableCommand,
    automationsRemoveCommand,
    automationsRunCommand,
    automationsToolsCommand,
    automationsModelsCommand,
    automationsCreditsCommand,
    automationsPullCommand,
    automationsPushCommand,
  ],
  options: [projectOption],
  examples: [
    { name: 'List automations', value: 'flexkit automations ls' },
    { name: 'Run one and follow it', value: `flexkit automations run ${ID} --follow` },
    { name: 'Keep a definition in git', value: `flexkit automations pull ${ID} automations/stock-report.json` },
  ],
};
