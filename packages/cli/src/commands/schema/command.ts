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

export const schemaPullCommand: Command = {
  name: 'pull',
  description:
    'Download the deployed schema of the project as JSON: entities, scopes, spaces, Studio title, menu groups and the schema hash. Writes to [file] when given, otherwise prints to stdout. Requires a user session (flexkit login), not an API token.',
  arguments: [{ name: 'file', required: false }],
  options: [
    {
      name: 'schema-only',
      shorthand: null,
      type: Boolean,
      description: 'Write only the entities array instead of the full response',
      deprecated: false,
    },
    {
      name: 'yes',
      shorthand: 'y',
      type: Boolean,
      description: 'Overwrite [file] without asking when it already exists',
      deprecated: false,
    },
    projectOption,
  ],
  examples: [
    { name: 'Save the deployed schema to a file', value: 'flexkit schema pull deployed-schema.json' },
    { name: 'Print the deployed schema of another project', value: 'flexkit schema pull -p k3m9x2q7wd' },
    {
      name: 'List the deployed entity names',
      value: "flexkit schema pull --schema-only | jq -r '.[].name'",
    },
    { name: 'Refresh a committed snapshot in CI', value: 'flexkit schema pull schema.snapshot.json --yes' },
  ],
};

export const schemaShowCommand: Command = {
  name: 'show',
  description:
    'Summarize the deployed schema: one row per entity with its attribute and relationship counts, then the scopes and spaces. With --entity, list the attributes of one entity. Requires a user session (flexkit login).',
  arguments: [],
  options: [
    {
      name: 'entity',
      shorthand: 'e',
      type: String,
      argument: 'NAME',
      description: 'Show the attributes of one entity (by name or plural)',
      deprecated: false,
    },
    {
      name: 'local',
      shorthand: null,
      type: Boolean,
      description: 'Summarize the schema in the local flexkit.config.ts instead of the deployed one',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Summarize the deployed schema', value: 'flexkit schema show' },
    { name: 'List the attributes of the product entity', value: 'flexkit schema show --entity product' },
    { name: 'Summarize the local config before deploying it', value: 'flexkit schema show --local' },
    {
      name: 'Print the names of the required attributes of an entity',
      value: "flexkit schema show -e order --json | jq -r '.attributes[] | select(.isRequired) | .name'",
    },
  ],
};

export const schemaDiffCommand: Command = {
  name: 'diff',
  description:
    'Compare the schema in the local flexkit.config.ts with the deployed one and show what `flexkit deploy` would change: added, removed and changed entities and attributes, scopes, spaces and menu groups. Removals are flagged as breaking and data type changes as blocking, like the deploy check. Without --project, every project in the config is compared. Requires a user session (flexkit login).',
  arguments: [],
  options: [
    {
      name: 'exit-code',
      shorthand: null,
      type: Boolean,
      description: 'Exit with code 1 when there are differences (default: 0 unless the command fails)',
      deprecated: false,
    },
    {
      name: 'fail-on-breaking',
      shorthand: null,
      type: Boolean,
      description: 'Exit with code 1 only when a difference is breaking or blocking',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Preview what the next deploy changes', value: 'flexkit schema diff' },
    { name: 'Fail a CI job when the config and the deployed schema differ', value: 'flexkit schema diff --exit-code' },
    {
      name: 'Block a pull request that removes entities or attributes',
      value: 'flexkit schema diff --fail-on-breaking',
    },
    {
      name: 'List the breaking changes as JSON',
      value: "flexkit schema diff -p k3m9x2q7wd --json | jq '.[0].diff.issues'",
    },
  ],
};

export const schemaCommand: Command = {
  name: 'schema',
  description:
    'Inspect the schema deployed to a project and compare it with your local flexkit.config.ts. Deploy changes with `flexkit deploy`.',
  arguments: [{ name: 'subcommand', required: false }],
  subcommands: [schemaPullCommand, schemaShowCommand, schemaDiffCommand],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Summarize the deployed schema', value: 'flexkit schema show' },
    { name: 'Preview what the next deploy changes', value: 'flexkit schema diff' },
    { name: 'Save the deployed schema to a file', value: 'flexkit schema pull deployed-schema.json' },
  ],
};
