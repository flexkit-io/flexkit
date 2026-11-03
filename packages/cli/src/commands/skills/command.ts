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
const visibilityOption = option(
  'visibility',
  String,
  'Who can use the skill: project, space or personal (default: project, or unchanged on update)',
  'VISIBILITY'
);
const spaceOption = option('space', String, 'Space id for a space-scoped skill (sets --visibility space)', 'SPACE_ID');

export const skillsListCommand: Command = {
  name: 'ls',
  description:
    'List the skills you can use in the project: Studio skills, skills defined in code (flexkit.tools.ts) and plugin skills.',
  arguments: [],
  options: [
    option('search', String, 'Rank skills by relevance to a question or keywords', 'TEXT', 's'),
    option('visibility', String, 'Only these visibilities, comma separated: project,space,personal', 'LIST'),
    option('limit', Number, 'Skills per page, 1–100 (default: 25)', 'N', 'n'),
    option('offset', Number, 'Skills to skip, for paging (default: 0)', 'N'),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List skills', value: 'flexkit skills ls' },
    { name: 'Find the skills about refunds', value: 'flexkit skills ls --search "refund an order"' },
    {
      name: 'Only your personal skills, as JSON',
      value: "flexkit skills ls --visibility personal --json | jq '.skills[].name'",
    },
  ],
};

export const skillsInspectCommand: Command = {
  name: 'inspect',
  description: 'Show a skill: its metadata, then its Markdown content. Accepts the skill id or its exact name.',
  arguments: [{ name: 'idOrName', required: true }],
  options: [
    option('content', Boolean, 'Print only the Markdown content on stdout (for redirecting to a file)'),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Show a skill by name', value: 'flexkit skills inspect refund-policy' },
    {
      name: 'Save the content to a file',
      value: 'flexkit skills inspect 3f9c2a1e-8d4b-4c7a-9e2f-5b6a7c8d9e0f --content > refund-policy.md',
    },
    {
      name: 'Print the description with jq',
      value: "flexkit skills inspect refund-policy --json | jq -r '.skill.description'",
    },
  ],
};

export const skillsAddCommand: Command = {
  name: 'add',
  description:
    'Create a Studio skill from a Markdown file (or - for stdin). Front matter `name`, `description`, `visibility` and `space` in the file are used; flags override them. The name defaults to the file name.',
  arguments: [{ name: 'file|-', required: true }],
  options: [
    option('name', String, 'Skill name, up to 120 characters (default: front matter, else the file name)', 'NAME'),
    option(
      'description',
      String,
      'When the agent should load the skill, up to 1024 characters (required unless in front matter)',
      'TEXT'
    ),
    visibilityOption,
    spaceOption,
    jsonOption,
    projectOption,
  ],
  examples: [
    {
      name: 'Create a skill from a file',
      value: 'flexkit skills add ./refunds.md --name refund-policy --description "How to approve and issue refunds"',
    },
    { name: 'Use the front matter of the file', value: 'flexkit skills add ./skills/onboarding-checklist.md' },
    {
      name: 'Create a personal skill from stdin',
      value:
        'cat notes.md | flexkit skills add - --name my-shortcuts --description "My reporting shortcuts" --visibility personal',
    },
  ],
};

export const skillsUpdateCommand: Command = {
  name: 'update',
  description:
    'Change a Studio skill. Fields you do not pass keep their current value. Skills from code or plugins are read-only; fork them first.',
  arguments: [{ name: 'idOrName', required: true }],
  options: [
    option(
      'file',
      String,
      'Replace the content with a Markdown file (or - for stdin); its front matter name/description apply too',
      'FILE',
      'f'
    ),
    option('name', String, 'New name', 'NAME'),
    option('description', String, 'New description', 'TEXT'),
    visibilityOption,
    spaceOption,
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Replace the content from a file', value: 'flexkit skills update refund-policy --file ./refunds.md' },
    {
      name: 'Rename a skill',
      value: 'flexkit skills update 3f9c2a1e-8d4b-4c7a-9e2f-5b6a7c8d9e0f --name refund-policy-eu',
    },
    {
      name: 'Share a personal skill with a space',
      value: 'flexkit skills update my-shortcuts --space 7d1e0b52-3c44-4f0e-a2b1-9f8e7d6c5b4a',
    },
  ],
};

export const skillsRemoveCommand: Command = {
  name: 'rm',
  description:
    'Delete a Studio skill. Automations that attach it no longer load it. Skills from code or plugins cannot be deleted here.',
  arguments: [{ name: 'idOrName', required: true }],
  options: [yesOption, jsonOption, projectOption],
  examples: [
    { name: 'Delete a skill', value: 'flexkit skills rm refund-policy' },
    {
      name: 'Delete without a prompt (scripts)',
      value: 'flexkit skills rm 3f9c2a1e-8d4b-4c7a-9e2f-5b6a7c8d9e0f --yes',
    },
  ],
};

export const skillsForkCommand: Command = {
  name: 'fork',
  description:
    'Copy a skill into a new personal Studio skill named "<name> (copy)" that you can edit. Use it to change a skill from code or a plugin.',
  arguments: [{ name: 'idOrName', required: true }],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Fork a plugin skill', value: 'flexkit skills fork shopify/order-lookup' },
    { name: 'Fork and print the new id', value: "flexkit skills fork catalog-review --json | jq -r '.skill.id'" },
  ],
};

export const skillsPullCommand: Command = {
  name: 'pull',
  description:
    'Write the Studio skills you can see as Markdown files with front matter (id, name, description, visibility, space) into a folder, so they can live in git. Existing files are matched by their `id` and overwritten.',
  arguments: [{ name: 'dir', required: false }],
  options: [
    option('dry-run', Boolean, 'Show which files would be written without writing them'),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Pull into ./skills', value: 'flexkit skills pull' },
    { name: 'Pull into another folder', value: 'flexkit skills pull ./docs/agent-skills' },
    { name: 'See what would change', value: 'flexkit skills pull --dry-run' },
  ],
};

export const skillsPushCommand: Command = {
  name: 'push',
  description:
    'Create or update Studio skills from the Markdown files in a folder. A file matches a skill by its `id` front matter, else by name. Skills from code or plugins are skipped. Remote skills without a file are kept unless you pass --prune.',
  arguments: [{ name: 'dir', required: false }],
  options: [
    option('dry-run', Boolean, 'Show the plan without changing anything'),
    option('prune', Boolean, 'Also delete the Studio skills that no file matches (asks first)'),
    yesOption,
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Preview what a push would change', value: 'flexkit skills push --dry-run' },
    { name: 'Push ./skills', value: 'flexkit skills push' },
    { name: 'Mirror a folder exactly in CI', value: 'flexkit skills push ./skills --prune --yes' },
  ],
};

export const skillsCommand: Command = {
  name: 'skills',
  description:
    'Manage project skills: Markdown how-to documents the agent loads when a task matches their description. Pull and push them as files to keep them in git.',
  arguments: [],
  subcommands: [
    skillsListCommand,
    skillsInspectCommand,
    skillsAddCommand,
    skillsUpdateCommand,
    skillsRemoveCommand,
    skillsForkCommand,
    skillsPullCommand,
    skillsPushCommand,
  ],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List skills', value: 'flexkit skills ls' },
    {
      name: 'Create a skill from a Markdown file',
      value: 'flexkit skills add ./refunds.md --description "How to issue refunds"',
    },
    {
      name: 'Sync a folder of skills',
      value: 'flexkit skills pull ./skills && flexkit skills push ./skills --dry-run',
    },
  ],
};
