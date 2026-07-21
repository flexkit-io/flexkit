import type { Command } from '../help';

export const importCommand: Command = {
  name: 'import',
  description:
    'Import entities and assets from an NDJSON file, a directory or a tarball created by flexkit export. Asset references are uploaded first and connected by _id; entity-to-entity refs are connected in a second pass.',
  arguments: [
    {
      name: 'file.ndjson|dir|tarball',
      required: true,
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
      name: 'dry-run',
      shorthand: null,
      type: String,
      description: 'Validate the input and report what would happen without uploading or mutating anything',
      deprecated: false,
    },
    {
      name: 'skip-existing',
      shorthand: null,
      type: String,
      description: 'Skip entities whose _id already exists (default behavior)',
      deprecated: false,
    },
    {
      name: 'replace',
      shorthand: null,
      type: String,
      description: 'Update entities whose _id already exists instead of skipping them',
      deprecated: false,
    },
    {
      name: 'batch-size',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of entities per create mutation (default 10)',
      deprecated: false,
    },
    {
      name: 'concurrency',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of parallel asset uploads (default 5)',
      deprecated: false,
    },
    {
      name: 'tag',
      shorthand: null,
      type: String,
      argument: 'NAME',
      description: 'Tag every imported asset with the given tag (created if missing)',
      deprecated: false,
    },
    {
      name: 'json',
      shorthand: null,
      type: String,
      description: 'Output the import summary as JSON on stdout',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Validate an import file without writing anything',
      value: 'flexkit import products.ndjson --dry-run',
    },
    {
      name: 'Import products with local images',
      value: 'flexkit import ./export/data.ndjson',
    },
    {
      name: 'Re-import a full export, updating existing entities',
      value: 'flexkit import flexkit-export-my-project.tar.gz --replace',
    },
  ],
};
