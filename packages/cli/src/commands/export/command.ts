import type { Command } from '../help';

export const exportCommand: Command = {
  name: 'export',
  description:
    'Export the full dataset (entities, assets and files) into a tarball that flexkit import can restore into any project.',
  arguments: [
    {
      name: 'dest.tar.gz',
      required: false,
    },
  ],
  options: [
    {
      name: 'project',
      shorthand: null,
      type: String,
      argument: 'ID',
      description: 'Project id (required when the local config defines several projects)',
      deprecated: false,
    },
    {
      name: 'type',
      shorthand: null,
      type: String,
      argument: 'ENTITY',
      description: 'Only export the given entity type (repeatable via comma-separated values)',
      deprecated: false,
    },
    {
      name: 'concurrency',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of parallel file downloads (default 5)',
      deprecated: false,
    },
    {
      name: 'overwrite',
      shorthand: null,
      type: String,
      description: 'Overwrite the destination file if it exists',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Export the full dataset',
      value: 'flexkit export',
    },
    {
      name: 'Export only products to a specific file',
      value: 'flexkit export products.tar.gz --type product',
    },
    {
      name: 'Restore an export into another project',
      value: 'flexkit import flexkit-export-my-project.tar.gz --project other-project',
    },
  ],
};
